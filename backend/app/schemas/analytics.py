"""Schema đầu vào cho API thống kê (UC12)."""
from pydantic import BaseModel, Field

UUID_PATTERN = r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"


class SessionPayload(BaseModel):
    session_id: str = Field(pattern=UUID_PATTERN)
