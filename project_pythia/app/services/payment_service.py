import logging
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from project_pythia.app.schemas.payment_create import PaymentCreate
from project_pythia.app.models.payment import Payment
from project_pythia.app.models.user import User
from project_pythia.app.schemas.payment_status import PaymentStatus
from project_pythia.app.schemas.telegramm_payment import TelegramPaymentWebhook

logger = logging.getLogger(__name__)


class PaymentService:
    @staticmethod
    async def create_payment(
            session: AsyncSession, data: PaymentCreate
    ) -> Payment:
        payment = Payment(
            user_id=data.user_id,
            bundle_id=data.bundle_id,
            tokens=data.tokens,
            stars=data.stars,
            status=PaymentStatus.PENDING
        )
        session.add(payment)
        await session.flush()
        return payment

    @staticmethod
    async def verify_payment(session: AsyncSession, telegram_data: TelegramPaymentWebhook) -> bool:
        pay_uuid = telegram_data.payment_id
        stmt = select(Payment).where(Payment.id == pay_uuid, Payment.status == PaymentStatus.PENDING)
        result = await session.execute(stmt)
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def complete_payment(session: AsyncSession, telegram_data: TelegramPaymentWebhook) -> Payment | None:
        pay_uuid = telegram_data.payment_id
        charge_id = telegram_data.telegram_charge_id
        stmt = select(Payment).where(Payment.id == pay_uuid).with_for_update()
        result = await session.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            logger.error(f"Payment {pay_uuid} not found.")
            return None

        if payment.status != PaymentStatus.PENDING:
            logger.warning(f"Payment {pay_uuid} is already {payment.status}. Ignoring webhook.")
            return None

        payment.status = PaymentStatus.COMPLETED
        payment.telegram_charge_id = charge_id
        payment.completed_at = datetime.now(timezone.utc)

        await session.execute(
            update(User)
            .where(User.id == payment.user_id)
            .values(tokens=User.tokens + payment.tokens)
        )
        logger.info(f"Payment {pay_uuid} completed. Added {payment.tokens} tokens to user_id={payment.user_id}")
        return payment

payment_service = PaymentService()

