import logging
from uuid import UUID

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.types import PreCheckoutQuery, Message
from aiogram import F
from project_pythia.app.core.db import async_session_maker
from project_pythia.app.services.payment_service import payment_service
from project_pythia.app.schemas.telegramm_payment import TelegramPaymentWebhook
from aiogram.enums import ParseMode
from project_pythia.app.core.config import settings

logger = logging.getLogger(__name__)


class TelegramAdapter:
    def __init__(self, dp: Dispatcher):
        self.bot = Bot(
            token=settings.bot.bot_token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML)
        )
        self.dp = dp
        self._register_payment_handlers()

    async def send_message(self, chat_id: int, text: str):
        try:
            await self.bot.send_message(chat_id=chat_id, text=text)
        except Exception as e:
            logger.error(f"Failed to send Telegram message to chat_id={chat_id}: {e}")

    def _register_payment_handlers(self):
        @self.dp.pre_checkout_query()
        async def process_pre_checkout_query(pre_checkout_query: PreCheckoutQuery):
            try:
                pay_uuid = UUID(pre_checkout_query.invoice_payload)
                webhook_data = TelegramPaymentWebhook(
                    payment_id=pay_uuid,
                    telegram_charge_id=""
                )
            except ValueError:
                logger.error(f"Invalid UUID in payload: {pre_checkout_query.invoice_payload}")
                await pre_checkout_query.answer(ok=False, error_message="Системная ошибка.")
                return

            async with async_session_maker() as session:
                is_valid = await payment_service.verify_payment(session, webhook_data)

            if is_valid:
                await pre_checkout_query.answer(ok=True)
            else:
                logger.warning(f"Rejected PreCheckoutQuery for payment: {pay_uuid}")
                await pre_checkout_query.answer(ok=False, error_message="Платеж недействителен или уже обработан.")

        @self.dp.message(F.successful_payment)
        async def process_successful_payment(message: Message):
            payment_info = message.successful_payment
            tg_id = message.from_user.id

            try:
                pay_uuid = UUID(payment_info.invoice_payload)
                webhook_data = TelegramPaymentWebhook(
                    payment_id=pay_uuid,
                    telegram_charge_id=payment_info.telegram_payment_charge_id
                )
            except ValueError:
                logger.error(f"Invalid UUID in successful payment: {payment_info.invoice_payload}")
                return

            async with async_session_maker() as session:
                try:
                    payment = await payment_service.complete_payment(session, webhook_data)

                    if payment:
                        await session.commit()
                        await self.bot.send_message(
                            chat_id=tg_id,
                            text=f"🔥 <b>Баланс пополнен!</b>\n\nТранзакция успешна. Начислен вектор: <b>{payment.tokens} токенов</b>."
                        )
                    else:
                        await session.rollback()

                except Exception as e:
                    await session.rollback()
                    logger.error(f"Failed to process webhook for payment {pay_uuid}: {e}", exc_info=True)



dp = Dispatcher()
telegram_adapter = TelegramAdapter(dp)
