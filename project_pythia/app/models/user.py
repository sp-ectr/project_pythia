from datetime import datetime

from project_pythia.app.models.base import Base
from sqlalchemy import BigInteger, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from project_pythia.app.models.readings import Reading


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key = True)
    tg_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str] =  mapped_column(String(64))

    candles: Mapped[int] = mapped_column(default=1)
    strikes: Mapped[int] = mapped_column(default=0)

    is_active: Mapped[bool] = mapped_column(default=True)
    language_code: Mapped[str] = mapped_column(String(10), server_default="ru")

    last_refill: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    readings: Mapped[list["Reading"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"User(id={self.id}, tg_id={self.tg_id}, username={self.username})"




