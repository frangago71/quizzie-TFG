from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, model_validator


class OptionCreate(BaseModel):
    text: str
    is_correct: bool

    model_config = ConfigDict(json_schema_extra={"example": {"text": "20", "is_correct": False}})


class QuestionCreate(BaseModel):
    text: str
    points: int = 1
    options: List[OptionCreate]

    @model_validator(mode="after")
    def validate_options_logic(self) -> "QuestionCreate":
        correct_count = sum(1 for o in self.options if o.is_correct)
        total_options = len(self.options)

        if correct_count != 1:
            raise ValueError("Cada pregunta debe tener exactamente una opción correcta.")
        if total_options < 2:
            raise ValueError("Cada pregunta debe tener al menos dos opciones en total.")
        if (total_options - correct_count) < 1:
            raise ValueError("Cada pregunta debe tener al menos una opción falsa.")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "¿Cuánto es 2 + 2?",
                "points": 1,
                "options": [
                    {"text": "4", "is_correct": True},
                    {"text": "5", "is_correct": False},
                    {"text": "3", "is_correct": False},
                ],
            }
        }
    )


class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    questions: List[QuestionCreate]
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Mi primer Quiz",
                "description": "Test de ejemplo",
                "questions": [
                    {
                        "text": "¿2 + 2?",
                        "points": 1,
                        "options": [
                            {"text": "4", "is_correct": True},
                            {"text": "5", "is_correct": False},
                        ],
                    }
                ],
            }
        }
    )


class OptionUpdate(BaseModel):
    id: Optional[int] = None
    text: str
    is_correct: bool


class QuestionUpdate(BaseModel):
    id: Optional[int] = None
    text: str
    points: int = 1
    options: List[OptionUpdate]

    @model_validator(mode="after")
    def validate_options_logic(self) -> "QuestionUpdate":
        correct_count = sum(1 for o in self.options if o.is_correct)
        total_options = len(self.options)

        if correct_count != 1:
            raise ValueError("Cada pregunta debe tener exactamente una opción correcta.")
        if total_options < 2:
            raise ValueError("Cada pregunta debe tener al menos dos opciones en total.")
        if (total_options - correct_count) < 1:
            raise ValueError("Cada pregunta debe tener al menos una opción falsa.")
        return self


class QuizUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    questions: List[QuestionUpdate]


class OptionRead(BaseModel):
    id: int
    text: str
    is_correct: bool
    model_config = ConfigDict(from_attributes=True)


class QuestionRead(BaseModel):
    id: int
    text: str
    points: int
    options: List[OptionRead]
    model_config = ConfigDict(from_attributes=True)


class QuizRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    questions: List[QuestionRead]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class QuizListRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    created_at: datetime
    active_room_id: Optional[int] = None
    active_room_status: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
