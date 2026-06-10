from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., examples=["cervantes@quizzie.com"])
    password: str = Field(..., examples=["123456"])


class TeacherCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, examples=["Manuel Losada"])
    email: EmailStr = Field(..., examples=["losada@quizzie.com"])
    password: str = Field(..., min_length=6, examples=["123456"])
