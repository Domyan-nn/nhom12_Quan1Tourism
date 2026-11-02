"""Request validation; uniqueness is checked by the database."""

import unicodedata

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(max_length=200)
    name_en: str = Field(max_length=200)

    @field_validator("name", "name_en")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = unicodedata.normalize("NFC", value.strip())
        if not value:
            raise ValueError("Name must not be empty")
        return value
