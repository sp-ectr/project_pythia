import json
import random
from pathlib import Path

from project_pythia.app.schemas.tarot import TarotCard, CardDraw

POSITIONS = {
    1: "Суть ситуации / настоящее",
    2: "Препятствие или усиливающий фактор",
    3: "Основа ситуации / корень (прошлое)",
    4: "Недавнее прошлое (что только что повлияло)",
    5: "Сознательная цель / то, к чему стремится человек",
    6: "Ближайшее будущее (развитие ситуации)",
    7: "Ты сам / твое состояние и позиция",
    8: "Окружение / внешние влияния",
    9: "Надежды и страхи (внутренний фон, подсознательные ожидания)",
    10: "Итог / наиболее вероятный исход при текущем векторе"
}


class TarotService:
    def __init__(self):
        json_path = Path(__file__).parent.parent / "assets" / "tarot_cards.json"
        with open(json_path, "r", encoding="utf-8") as f:
            raw_cards = json.load(f)
        self.all_cards = [TarotCard.model_validate(card) for card in raw_cards]

    def _shuffle(self) -> list[TarotCard]:
        deck = self.all_cards[:]
        random.shuffle(deck)
        return deck

    def draw_celtic_cross(self) -> list[CardDraw]:
        deck = self._shuffle()
        selected = deck[:10]

        spread = []

        for position, card in enumerate(selected, start=1):
            is_reversed = random.random() < 0.3

            keywords = card.reversed_keywords if is_reversed else card.upright_keywords

            spread.append(CardDraw(
                position=position,
                meaning=POSITIONS[position],
                card_name=card.name_ru,
                card_summary=", ".join(keywords),
                is_reversed=is_reversed
            ))

        return spread


tarot_service = TarotService()
