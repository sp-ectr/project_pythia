from pydantic import BaseModel
from typing import Optional, Literal

Suit = Literal["wands", "cups", "swords", "pentacles"]
Arcana = Literal["major", "minor"]

class TarotCard(BaseModel):
    id: int
    name: str
    name_ru: str
    arcana: Arcana
    number: int
    suit: Optional[Suit] = None
    image_url: str
    upright_keywords: list[str]
    reversed_keywords: list[str]


class CardDraw(BaseModel):
    position: int
    meaning: str
    card_name: str
    card_summary: str
    is_reversed: bool
