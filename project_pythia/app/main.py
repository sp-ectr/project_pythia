from fastapi import FastAPI

# Импортируем наш роутер с логикой
from project_pythia.app.api.oracle import router as oracle_router

# Инициализируем само приложение
app = FastAPI(
    title="Pythia Tarot API",
    description="Stateless Tarot Oracle with Gemini",
    version="1.0.0"
)

# Подключаем роутер.
# Теперь все эндпоинты из oracle_router будут доступны по адресу /api/oracle/...
app.include_router(oracle_router, prefix="/api")

# Делаем простой эндпоинт для проверки, что сервер вообще живой
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "alive", "message": "Пифия слушает..."}