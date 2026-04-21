from fastapi import APIRouter, HTTPException
from fastapi import Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from project_pythia.app.schemas.pythia import AskPythiaResponse
from project_pythia.app.core.db import get_session
from project_pythia.app.services.llm_client import llm_service
from project_pythia.app.services.tarot_service import tarot_service
from project_pythia.app.models.user import User
from project_pythia.app.models.readings import Reading


class AskRequest(BaseModel):
    tg_id: int
    question: str


router = APIRouter(prefix="/oracle", tags=["Oracle"])


@router.post("/ask", response_model=AskPythiaResponse)
async def ask_oracle(
        payload: AskRequest,
        session: AsyncSession = Depends(get_session)
):
    stml = select(User).where(User.tg_id == payload.tg_id)
    result = await session.execute(stml)

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.candles <= 0:
        raise HTTPException(status_code=403, detail="The candles have burned out. Come back tomorrow.")

    spread = tarot_service.draw_celtic_cross()

    spread_text = "\n".join([
        f"{c.position}. {c.meaning}: {c.card_name}{' (ПЕРЕВЕРНУТАЯ)' if c.is_reversed else ''}. "
        f"Ключевые смыслы: {c.card_summary}"
        for c in spread
    ])

    oracle_res = await llm_service.get_reading(payload.question, spread_text)

    if not oracle_res.is_safe:
        user.strikes += 1
        await session.commit()

        return AskPythiaResponse(
            reading_id=None,
            is_safe=False,
            refusal_reason=oracle_res.refusal_reason,
            interpretation=None
        )

    new_reading = Reading(
        user_id=user.id,  # Связываем расклад с конкретным юзером (используем внутренний ID базы, а не tg_id)
        question=payload.question,
        # Превращаем объекты карт в словари, чтобы база могла сохранить их как JSON
        spread={"cards": [c.model_dump() for c in spread]},
        # То же самое с ответом Пифии (сохраняем весь структурированный ответ)
        interpretation=oracle_res.model_dump()
    )

    user.candles -= 1

    session.add(new_reading)

    await session.commit()

    await session.refresh(new_reading)

    return AskPythiaResponse(
        reading_id=new_reading.id,
        is_safe=True,
        interpretation=oracle_res
    )
