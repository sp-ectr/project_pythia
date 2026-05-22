from project_pythia.app.core.config import settings

from groq import AsyncGroq

class WhisperAdapter:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.whisper.groq_token)

    async def transcribe(self, audio_bytes: bytes, filename: str = "voice.ogg") -> str:
        result = await self.client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-large-v3-turbo",
            language="ru"
        )
        return result.text

whisper = WhisperAdapter()