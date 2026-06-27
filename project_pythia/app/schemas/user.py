from pydantic import BaseModel, ConfigDict, Field


class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nodeId: str = Field(validation_alias="tg_id")
    username: str
    tokens: int
    language_code: str