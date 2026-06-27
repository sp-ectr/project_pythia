from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from starlette.middleware.cors import CORSMiddleware
from project_pythia.app.core.logging_config import setup_logging
setup_logging()

from project_pythia.app.core.limiter import limiter
from slowapi.middleware import SlowAPIMiddleware
from project_pythia.app.api.oracle import router as oracle_router
from project_pythia.app.api.users import router as users_router
from project_pythia.app.core.db import get_session
from project_pythia.app.models.user import User
from project_pythia.app.core.security import get_user

app = FastAPI(title="Pythia Tarot API")

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(oracle_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "alive"}


# ФЕЙКОВАЯ АВТОРИЗАЦИЯ ДЛЯ ТЕСТОВ В SWAGGER
async def mock_auth(session: AsyncSession = Depends(get_session)) -> User:
    result = await session.execute(select(User).where(User.tg_id == 471019051))
    user = result.scalar_one_or_none()
    if not user:
        raise RuntimeError("нет тот user")
    return user


app.dependency_overrides[get_user] = mock_auth  # type: ignore[attr-defined]
