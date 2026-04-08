from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class _BaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


class PostgresSettings(_BaseSettings):
    """
    Configuration for PostgreSQL connection (async).

    Attributes:
        db_host: Database host address.
        db_port: Database port.
        db_user: Username for authentication.
        db_password: Password for authentication.
        db_name: Database name.

    Properties:
        database_url: Async SQLAlchemy DSN for asyncpg driver.
    """
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:"
            f"{quote_plus(self.db_password)}@{self.db_host}:"
            f"{self.db_port}/{self.db_name}"
        )


class LLMSettings(_BaseSettings):
    """
       Configuration for LLM provider.

       Attributes:
           llm_api_key: API key used to authenticate with the LLM service.
       """
    llm_api_key: str


class AdapterSettings(_BaseSettings):
    """
       Configuration for bot adapter (e.g., Telegram).

       Attributes:
           bot_token: Authentication token for the bot platform.
       """
    bot_token: str


class Settings(_BaseSettings):
    """
        Aggregated application configuration.

        Combines all subsystem settings into a single object
        for convenient dependency injection and access.

        Attributes:
            postgres: PostgreSQL configuration.
            llm: LLM client configuration.
            adapter: Bot adapter configuration.
        """
    postgres: PostgresSettings = Field(default_factory=PostgresSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    adapter: AdapterSettings = Field(default_factory=AdapterSettings)

settings = Settings()
