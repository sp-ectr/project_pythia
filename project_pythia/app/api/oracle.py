import datetime

from fastapi import APIRouter, HTTPException
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select, desc

from project_pythia.app.core.security import get_user
from project_pythia.app.schemas.pythia import AskPythiaResponse
from project_pythia.app.core.db import get_session
from project_pythia.app.services.llm_client import llm_service
from project_pythia.app.services.tarot_service import tarot_service
from project_pythia.app.models.user import User
from project_pythia.app.models.readings import Reading

router = APIRouter(prefix="/oracle", tags=["Oracle"])


class AskRequest(BaseModel):
    question: str


@router.post("/ask", response_model=AskPythiaResponse)
async def ask_oracle(
        payload: AskRequest,
        user: User = Depends(get_user),
        session: AsyncSession = Depends(get_session)
):
    # Проверяем и рефилим свечи до любой логики
    now = datetime.datetime.now(datetime.UTC)
    async with session.begin():
        if user.last_refill.date() < now.date():
            await session.execute(
                update(User)
                .where(User.id == user.id)
                .values(candles=1, last_refill=now)
            )
            await session.refresh(user)

    # Проверяем наличие свечей до тасовки и llm
    if user.candles <= 0:
        raise HTTPException(403, "No candles left")

    # Тасуем колоду + сериализуем в 1 строку
    spread = tarot_service.draw_celtic_cross()
    spread_text = "\n".join([
        f"{c.position}. {c.meaning}: {c.card_name}"
        f"{' (ПЕРЕВЕРНУТАЯ)' if c.is_reversed else ''}. "
        f"Ключевые смыслы: {c.card_summary}"
        for c in spread
    ])
    # Получаем json от llm и открываем атомарную сессию в db
    oracle_res = await llm_service.get_reading(payload.question, spread_text)
    async with session.begin():
        if not oracle_res.is_safe:
            await session.execute(
                update(User)
                .where(User.id == user.id)
                .values(strikes=User.strikes + 1)
            )
            return AskPythiaResponse(
                reading_id=None,
                is_safe=False,
                refusal_reason=oracle_res.refusal_reason,
                interpretation=None
            )

        result = await session.execute(
            update(User)
            .where(User.id == user.id)
            .where(User.candles > 0)
            .values(candles=User.candles - 1)
            .returning(User.candles)
        )
        updated = result.scalar_one_or_none()

        if updated is None:
            raise HTTPException(403, "No candles left")

        new_reading = Reading(
            user_id=user.id,
            question=payload.question,
            spread={"cards": [c.model_dump() for c in spread]},
            interpretation=oracle_res.model_dump()
        )
        session.add(new_reading)
        await session.flush()
        reading_id = new_reading.id

    return AskPythiaResponse(
        reading_id=reading_id,
        is_safe=True,
        interpretation=oracle_res
    )


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
