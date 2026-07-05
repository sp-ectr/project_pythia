# project_pythia/app/main.py

import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from project_pythia.app.core.logging_config import setup_logging
setup_logging()

from project_pythia.app.core.limiter import limiter
from slowapi.middleware import SlowAPIMiddleware
from project_pythia.app.api.oracle import router as oracle_router
from project_pythia.app.api.users import router as users_router


logger = logging.getLogger(__name__)

app = FastAPI(title="Pythia Tarot API")

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(oracle_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "alive"}