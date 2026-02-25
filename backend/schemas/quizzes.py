from pydantic import BaseModel, model_validator, ConfigDict
from typing import List, Optional

class AnswerCreate(BaseModel):
    text: str
    is_correct: bool

class QuestionCreate(BaseModel):
    text: str
    points: int = 1
    answers: List[AnswerCreate]

    @model_validator(mode='after')
    def validate_answers_logic(self) -> 'QuestionCreate':
        correct_count = sum(1 for a in self.answers if a.is_correct)
        total_answers = len(self.answers)

        if correct_count != 1:
            raise ValueError("Cada pregunta debe tener exactamente una respuesta correcta.")
        
        if total_answers < 2:
            raise ValueError("Cada pregunta debe tener al menos dos respuestas en total.")
            
        if (total_answers - correct_count) < 1:
            raise ValueError("Cada pregunta debe tener al menos una respuesta falsa.")
            
        return self

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
                            "answers": [
                                {"text": "4", "is_correct": True},
                                {"text": "5", "is_correct": False}
                            ]
                        }
                    ]
                }
            }
        )