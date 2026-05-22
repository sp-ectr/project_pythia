from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from project_pythia.app.core.config import settings


class TelegramAdapter:
    def __init__(self):
        self.bot = Bot(
            token=settings.bot.bot_token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML)
        )

    async def send_message(self, chat_id: int, text: str):
        await self.bot.send_message(chat_id=chat_id, text=text)


telegram_adapter = TelegramAdapter()