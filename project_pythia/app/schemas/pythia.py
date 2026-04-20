from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class CardInterpretation(BaseModel):
    position: int = Field(description="Position number (1–10)")
    card_id: int = Field(description="Card ID")
    is_reversed: bool = Field(description="Was the card reversed in this position?")
    text: str = Field(description="Interpretation considering the card's orientation (upright or reversed)")


class OracleResponse(BaseModel):
    is_safe: bool = Field(
        description="True if the question is appropriate. "
                    "False if it involves child sexual abuse material (CSAM), violence, severe trolling, "
                    "or is clearly nonsensical")
    refusal_reason: str | None = Field(description="Reason for rejection, if is_safe is False.")
    intro: str | None = Field(description="Introductory mystical word of the Pythia")
    cards_interpretation: list[CardInterpretation] | None = Field(
        description="Interpretation of each card individually")
    conclusion: str | None = Field(description="Final conclusion and guidance")


class AskPythiaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    reading_id: UUID | None
    is_safe: bool
    refusal_reason: str | None = None
    interpretation: OracleResponse | None = None


class ReadingResponse(BaseModel):
    pass
