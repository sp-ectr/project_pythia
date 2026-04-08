from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from project_pythia.app.core.config import settings

engine = create_async_engine(
    settings.postgres.database_url,
    echo=True
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_session():
    async with async_session_maker() as session:
        yield session