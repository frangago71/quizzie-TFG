from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., examples=["cervantes@quizzie.com"])
    password: str = Field(..., examples=["123456"])
