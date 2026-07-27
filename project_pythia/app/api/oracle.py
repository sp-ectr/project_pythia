import logging
from uuid import UUID
import html

from aiogram.types import LabeledPrice
from fastapi import Request, UploadFile, Form, File
from fastapi import APIRouter, HTTPException
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select, desc
from starlette.background import BackgroundTasks

from project_pythia.app.core.config import settings
from project_pythia.app.core.security import get_user
from project_pythia.app.schemas.payment_create import PaymentCreate
from project_pythia.app.schemas.pythia import AskPythiaResponse, SendChatResponse, InvoiceResponse, InvoiceRequest
from project_pythia.app.core.db import get_session
from project_pythia.app.services.llm_client import llm_service
from project_pythia.app.services.payment_service import payment_service
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
    if user.tg_id not in settings.bot.admin_ids:
        # Чекаем страйки если больше 3 подозреваем на вредительство пока просто пробрасываем.
        if user.strikes >= 3:
            logger.warning(f"Blocked user_id={user.id} (tg_id={user.tg_id}): too many strikes ({user.strikes})")
            raise HTTPException(403, "User have to many strikes.")

        if user.tokens <= 0:
            logger.info(f"User_id={user.id} (tg_id={user.tg_id}) has no tokens left")
            raise HTTPException(403, "No tokens left")

    if voice:
        if voice.size > 2_000_000:
            logger.warning(f"User_id={user.id} tried to upload too large voice file: {voice.size} bytes")
            raise HTTPException(413, "Voice file too large (max 2MB).")

        audio_bytes = await voice.read()
        question = await whisper.transcribe(audio_bytes, filename=voice.filename)

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

    if oracle_res.cards_interpretation:
        for i, card in enumerate(spread):
            if i < len(oracle_res.cards_interpretation):
                oracle_res.cards_interpretation[i].card_id = card.card_id
                oracle_res.cards_interpretation[i].card_name = card.card_name

    # ВСЕГДА списываем токен (кроме админа) — юзер заплатил за сессию
    if user.tg_id not in settings.bot.admin_ids:
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

        logger.info(
            f"Successfully debited 1 token from user_id={user.id} (tg_id={user.tg_id}). "
            f"Tokens remaining: {updated}"
        )

    # Если unsafe — даем страйк, сохраняем reading с null interpretation
    if not oracle_res.is_safe:
        logger.warning(
            f"Unsafe response for user_id={user.id} (tg_id={user.tg_id}): "
            f"reason={oracle_res.refusal_reason!r}"
        )

        if user.tg_id not in settings.bot.admin_ids:
            new_strikes = user.strikes + 1
            is_active = False if new_strikes >= 3 else True

            await session.execute(
                update(User)
                .where(User.id == user.id)
                .values(strikes=new_strikes, is_active=is_active)
            )
            await session.commit()

            if not is_active:
                logger.warning(
                    f"User_id={user.id} (tg_id={user.tg_id}) has been BANNED (reached {new_strikes} strikes)")

        return AskPythiaResponse(
            reading_id=None,
            is_safe=False,
            question=question,
            refusal_reason=oracle_res.refusal_reason,
            strikes=user.strikes if user.tg_id in settings.bot.admin_ids else new_strikes,
            is_active=user.is_active if user.tg_id in settings.bot.admin_ids else is_active,
        )

    try:
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
            question=question,
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
            interpretation=r.interpretation,
            created_at=r.created_at
        ) for r in readings
    ]


@router.post("/send-to-chat/{reading_id}", response_model=SendChatResponse)
@limiter.limit("5/minute")
async def send_to_chat(
    request: Request,
    reading_id: UUID,
    background_tasks: BackgroundTasks,
    user: User =Depends(get_user),
    session: AsyncSession =Depends(get_session)
):
    result = await session.execute(
        select(Reading).where(
            Reading.id == reading_id,
            Reading.user_id == user.id,
        )
    )
    reading = result.scalar_one_or_none()

    if not reading:
        logger.info(f"Reading {reading_id} not found or access denied for user_id={user.id}")
        raise HTTPException(status_code=404, detail="Spread not found or access denied")

    interp_data = reading.interpretation

    intro = html.escape(interp_data.get("intro", ""))
    conclusion = html.escape(interp_data.get("conclusion", ""))

    messages = []

    current_message = (
        f"🔮 <b>Твое послание от Пифии:</b>\n\n"
        f"<i>{intro}</i>\n\n"
    )

    MAX_LEN = 4000  # небольшой запас до лимита Telegram (4096)

    for card in interp_data.get("cards_interpretation", []):
        position = html.escape(str(card.get("position", "")))
        meaning = html.escape(card.get("position_explanation", ""))
        name = html.escape(card.get("card_name", "Неизвестная карта"))
        reversed_flag = " (перевернутая)" if card.get("is_reversed") else ""
        text = html.escape(card.get("text", ""))

        card_block = (
            f"🎴 <b>{position}</b>\n"
            f"<i>{meaning}</i>\n"
            f"<b>{name}{reversed_flag}</b>\n"
            f"{text}\n\n"
        )

        if len(current_message) + len(card_block) > MAX_LEN:
            messages.append(current_message)
            current_message = card_block
        else:
            current_message += card_block

    conclusion_block = f"✨ <b>Итог:</b>\n{conclusion}"

    if len(current_message) + len(conclusion_block) > MAX_LEN:
        messages.append(current_message)
        messages.append(conclusion_block)
    else:
        current_message += conclusion_block
        messages.append(current_message)

    logger.info(
        f"Sending reading {reading_id} to chat for user_id={user.id} (tg_id={user.tg_id})"
    )

    for message in messages:
        background_tasks.add_task(
            telegram_adapter.send_message,
            user.tg_id,
            message,
        )

    return SendChatResponse(
        status="ok",
        message="Отправлено в чат",
    )


@router.post("/transcribe")
@limiter.limit("5/minute")
async def transcribe(
        request: Request,
        voice: UploadFile = File(...),
        user: User = Depends(get_user),
):
    if voice.size > 2_000_000:
        raise HTTPException(413, "Voice file too large (max 2MB).")

    audio_bytes = await voice.read()
    question = await whisper.transcribe(audio_bytes, filename=voice.filename)
    return {"question": question}


@router.post("/invoice", response_model=InvoiceResponse)
async def create_invoice(
        payload: InvoiceRequest,
        user: User = Depends(get_user),
        session: AsyncSession = Depends(get_session)
):
    try:
        bundle = payload.bundle_id
        payment_data = PaymentCreate(
            user_id=user.id,
            bundle_id=bundle,
            tokens=bundle.tokens,
            stars=bundle.stars,
        )

        payment = await payment_service.create_payment(session, payment_data)
        await session.commit()

        invoice_link = await telegram_adapter.bot.create_invoice_link(
            title=f"Токены Оракула ({bundle.tokens} шт.)",
            description=f"Пополнение баланса Пифии на {bundle.tokens} токенов.",
            prices=[LabeledPrice(label="Telegram Stars", amount=bundle.stars)],
            provider_token="",
            payload=str(payment.id),
            currency="XTR"
        )
        return InvoiceResponse(invoice_link=invoice_link)
    except Exception as e:
        await session.rollback()
        logger.error(f"Invoice error for tg_id={user.tg_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Invoice generation error")
