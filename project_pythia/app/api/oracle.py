import logging
from uuid import UUID

from fastapi import Request, UploadFile, Form, File
from fastapi import APIRouter, HTTPException
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select, desc
from starlette.background import BackgroundTasks

from project_pythia.app.core.config import settings
from project_pythia.app.core.security import get_user
from project_pythia.app.schemas.pythia import AskPythiaResponse, SendChatResponse
from project_pythia.app.core.db import get_session
from project_pythia.app.services.llm_client import llm_service
from project_pythia.app.services.tarot_service import tarot_service
from project_pythia.app.services.telegram_service import telegram_adapter
from project_pythia.app.services.whisper_service import whisper
from project_pythia.app.models.user import User
from project_pythia.app.models.readings import Reading
from project_pythia.app.core.limiter import limiter

router = APIRouter(prefix="/oracle", tags=["Oracle"])

logger = logging.getLogger(__name__)


@router.post("/ask", response_model=AskPythiaResponse)
@limiter.limit("2/minute")
async def ask_oracle(
        request: Request,
        question: str | None = Form(None),
        voice: UploadFile | None = File(None),
        user: User = Depends(get_user),
        session: AsyncSession = Depends(get_session)
):
    if not user.tg_id in settings.bot.admin_ids:
        # Чекаем страйки если больше 3 подозреваем на вредительство пока просто пробрасываем.
        if user.strikes >= 3:
            logger.warning(f"Blocked user_id={user.id} (tg_id={user.tg_id}): too many strikes ({user.strikes})")
            raise HTTPException(403, "User have to many strikes.")

        if user.tokens <= 0:
            logger.info(f"User_id={user.id} (tg_id={user.tg_id}) has no tokens left")
            raise HTTPException(403, "No tokens left")

    if voice:
        audio_bytes = await voice.read()
        if len(audio_bytes) > 256_000:
            raise HTTPException(413, "Max 10 sec.")
        question = await whisper.transcribe(audio_bytes)

    if not question:
        raise HTTPException(422, "No data in question!")

    # Логика карт и LLM
    spread = tarot_service.draw_celtic_cross()
    spread_text = "\n".join([
        f"{c.position}. {c.meaning}: {c.card_name}"
        f"{' (ПЕРЕВЕРНУТАЯ)' if c.is_reversed else ''}. "
        f"Ключевые смыслы: {c.card_summary}"
        for c in spread
    ])

    oracle_res = await llm_service.get_reading(question, spread_text)

    # Минусуем токен если не безопасно и даем страйк
    if not oracle_res.is_safe:
        logger.warning(
            f"Unsafe response for user_id={user.id} (tg_id={user.tg_id}): "
            f"reason={oracle_res.refusal_reason!r}"
        )
        await session.execute(
            update(User)
            .where(User.id == user.id, User.tokens > 0)
            .values(tokens=User.tokens - 1, strikes=User.strikes + 1)
        )
        await session.commit()
        return AskPythiaResponse(reading_id=None, is_safe=False, refusal_reason=oracle_res.refusal_reason)

    try:
        if not user.tg_id in settings.bot.admin_ids:
            result = await session.execute(
                update(User)
                .where(User.id == user.id)
                .where(User.tokens > 0)
                .values(tokens=User.tokens - 1)
                .returning(User.tokens)
            )
            updated = result.scalar_one_or_none()

            if updated is None:
                await session.rollback()
                logger.warning(
                    f"Race condition: tokens depleted mid-request for user_id={user.id} (tg_id={user.tg_id})"
                )
                raise HTTPException(403, "No tokens left (race condition protected)")

        # Сохраняем результат гадания
        new_reading = Reading(
            user_id=user.id,
            question=question,
            spread={"cards": [c.model_dump() for c in spread]},
            interpretation=oracle_res.model_dump()
        )
        session.add(new_reading)
        await session.commit()
        await session.refresh(new_reading)

        logger.info(f"Reading {new_reading.id} created for user_id={user.id} (tg_id={user.tg_id})")

        return AskPythiaResponse(
            reading_id=new_reading.id,
            is_safe=True,
            interpretation=oracle_res
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to save reading for user_id={user.id} (tg_id={user.tg_id}): {type(e).__name__}: {e}",
            exc_info=True
        )
        await session.rollback()
        raise


@router.get("/history", response_model=list[AskPythiaResponse])
async def get_history(
        user: User = Depends(get_user),
        session: AsyncSession = Depends(get_session),
        limit: int = 10,
        offset: int = 0
):
    result = await session.execute(
        select(Reading).where(Reading.user_id == user.id).order_by(desc(Reading.created_at)).limit(limit).offset(
            offset)
    )
    readings = result.scalars().all()

    return [
        AskPythiaResponse(
            reading_id=r.id,
            is_safe=True,
            interpretation=r.interpretation
        ) for r in readings
    ]


@router.post("/send-to-chat/{reading_id}", response_model=SendChatResponse)
@limiter.limit("5/minute")
async def send_to_chat(
        request: Request,
        reading_id: UUID,
        background_tasks: BackgroundTasks,
        user: User = Depends(get_user),
        session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(Reading)
        .where(Reading.id == reading_id, Reading.user_id == user.id)
    )
    reading = result.scalar_one_or_none()

    if not reading:
        logger.info(f"Reading {reading_id} not found or access denied for user_id={user.id}")
        raise HTTPException(status_code=404, detail="Spread not found or access denied")

    interp_data = reading.interpretation
    intro = interp_data.get("intro", "")
    conclusion = interp_data.get("conclusion", "")

    msg_text = f"🔮 <b>Твое послание от Пифии:</b>\n\n<i>{intro}</i>\n\n"

    for card in interp_data.get("cards_interpretation", []):
        position = card.get("position")
        meaning = card.get("position_meaning", "")
        name = card.get("card_name", "Неизвестная карта")
        reversed_flag = " (перевернутая)" if card.get("is_reversed") else ""

        text = card.get("text", "")

        msg_text += (
            f"🎴 <b>{position}. {meaning}</b>\n"
            f"<b>{name}{reversed_flag}</b>\n"
            f"{text}\n\n"
        )

    msg_text += f"✨ <b>Итог:</b>\n{conclusion}"

    logger.info(f"Sending reading {reading_id} to chat for user_id={user.id} (tg_id={user.tg_id})")
    background_tasks.add_task(telegram_adapter.send_message, user.tg_id, msg_text)

    return SendChatResponse(status="ok", message="Отправлено в чат")