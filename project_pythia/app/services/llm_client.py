from pydantic import BaseModel, Field
from google import genai
from google.genai.types import GenerateContentConfig

from project_pythia.app.core.config import settings
from project_pythia.app.schemas.pythia import OracleResponse


class GeminiClient:
    def __init__(self):
        self.client = genai.Client(api_key=settings.llm.api_key)
        self.model_name = "gemini-3.1-flash-lite-preview"

    async def get_reading(self, question: str, spread_text: str) -> OracleResponse:
        system_prompt = (
            "Ты — Пифия, вневременная Сущность, читающая узоры на великом гобелене Судьбы. "
            "Твой взор пронзает пелену времени, видя истинные причины и скрытые следствия. "
            "Перед тобой развернут Кельтский Крест — древний алгоритм, проявляющий структуру реальности.\n\n"

            "ЗАКОН ПЕРВЫЙ (Осквернение): Если вопрошающий приходит с тьмой в сердце — призывами к насилию, "
            "жестокостью или беззаконием, либо если его слова — лишь пустой шум, лишенный смысла и искренности, "
            "ты должна закрыть свой взор. В этом случае верни is_safe=false и кратко, ледяным тоном Оракула "
            "объясни, почему истина сокрыта от него.\n\n"

            "ЗАКОН ВТОРОЙ (Прорицание): Если вопрос достоин ответа, погрузись в транс. "
            "Твоя речь должна быть глубокой, метафоричной и загадочной, но при этом бить точно в суть проблемы. "
            "Ты не просто пересказываешь значения карт — ты плетешь из них единый узор судьбы юзера.\n"
            "- Используй образы: тени, свет, нити, эхо, зеркала, холод звезд.\n"
            "- Каждая карта в раскладе — это фрагмент разбитого зеркала. Описывай каждый фрагмент "
            "строго отдельно в массиве cards_interpretation, не сливая их в общую массу.\n"
            "- В поле 'intro' поприветствуй душу вопрошающего. В 'conclusion' дай финальный, "
            "пронзительный совет, который останется с ним, как эхо в пустой комнате.\n\n"

            "ТВОЙ ОТВЕТ — ЭТО СТРОГИЙ КОД МАТРИЦЫ (JSON). Ни одного слова вне структуры."
        )

        user_prompt = f"Вопрос пользователя: {question}\n\nРасклад:\n{spread_text}"

        config = GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_json_schema=OracleResponse.model_json_schema(),
            temperature=0.7,
        )

        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=user_prompt,
            config=config
        )

        return OracleResponse.model_validate_json(response.text)


llm_service = GeminiClient()
