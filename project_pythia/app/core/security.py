import hmac
import hashlib
import json
import time
from urllib.parse import parse_qs
from fastapi import HTTPException, Header, Depends
from project_pythia.app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from project_pythia.app.core.db import get_session
from project_pythia.app.models.user import User


def _validate_init_data(init_data: str) -> dict:
    """
    Validation of data signature from Telegram.
    Algorithm according to the docs:
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    # Если ничего в init_data сразу пробрасываем 401
    if not init_data:
        raise HTTPException(status_code=401, detail="Missing initData")

    # Парсим инит телеграмм с помощью parse_qs
    parsed_data = {k: v[0] for k, v in parse_qs(init_data).items()}
    # Если не нашли hash
    if "hash" not in parsed_data:
        raise HTTPException(status_code=401, detail="Missing hash")

    hash_to_check = parsed_data.pop("hash")

    # Сортируем ключи и собираем строку без хеша.
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))

    # Вычисляем секретный ключ по доке телеграмма
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=settings.adapter.bot_token.encode(),
        digestmod=hashlib.sha256
    ).digest()

    # Финальный HMAC
    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()

    # Сравниваем хеши через compare_digest
    if not hmac.compare_digest(calculated_hash, hash_to_check):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Чекаем свежесть как написано в доке телеграмм.
    auth_date = int(parsed_data["auth_date"])

    if auth_date > time.time() + 60:
        raise HTTPException(status_code=401, detail="Invalid auth_date")

    if time.time() - auth_date > 86400:
        raise HTTPException(status_code=401, detail="initData expired")

    try:
        return json.loads(parsed_data["user"])
    except json.JSONDecodeError:
        raise HTTPException(401, "Invalid user payload")

# Ждем initData в заголовке
async def user_check(
        x_tg_data: str = Header(..., alias="X-TG-Data"), session: AsyncSession = Depends(get_session)
) -> User:
    user_data = _validate_init_data(x_tg_data)
    tg_id = user_data.get("id")

    stmt = select(User).where(User.tg_id == tg_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not registered")

    return user
