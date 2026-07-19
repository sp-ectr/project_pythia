from uuid import UUID
from pydantic import BaseModel

class TelegramPaymentWebhook(BaseModel):
    payment_id: UUID
    telegram_charge_id: str