from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class CardInterpretation(BaseModel):
    position: int = Field(description="Position number (1–10)")
    position_explanation: str = Field(description="Brief explanation of what this position means for the user's life")
    card_id: int = Field(description="Card ID")
    card_name: str = Field(description="Name of the card")

    is_reversed: bool = Field(description="Was the card reversed in this position?")

    text: str = Field(
        description="Detailed, deep and elaborate psychological interpretation of the card in this context. "
                    "Minimum 5-7 long, comprehensive, therapeutic and rich sentences. "
                    "Do not write short summaries or lazy bullet points."
    )


class OracleResponse(BaseModel):
    is_safe: bool = Field(
        description="True if the question is appropriate. "
                    "False if it involves child sexual abuse material (CSAM), violence, severe trolling, "
                    "or is clearly nonsensical")
    refusal_reason: str | None = Field(description="Reason for rejection, if is_safe is False.")
    intro: str | None = Field(
        description="Warm, deep, and elaborate introductory mystical word of the Pythia. Minimum 3-4 rich sentences."
    )
    cards_interpretation: list[CardInterpretation] | None = Field(
        description="Interpretation of each card individually")
    conclusion: str | None = Field(
        description="Deep, elaborate and comprehensive final conclusion and guidance. Minimum 4-5 rich sentences."
    )


class AskPythiaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    reading_id: UUID | None
    is_safe: bool
    refusal_reason: str | None = None
    interpretation: OracleResponse | None = None
    strikes: int = Field(default=0, description="Current strike count after this request")
    is_active: bool = Field(default=True, description="Whether the user account is still active")


class SendChatResponse(BaseModel):
    status: str
    message: str
