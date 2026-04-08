from pydantic import BaseModel
from typing import Optional, Literal, List

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
    upright_keywords: List[str]
    reversed_keywords: List[str]