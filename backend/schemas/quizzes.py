from pydantic import BaseModel, model_validator, ConfigDict
from typing import List, Optional

class OptionCreate(BaseModel):
    text: str
    is_correct: bool

class QuestionCreate(BaseModel):
    text: str
    points: int = 1
    options: List[OptionCreate]

    @model_validator(mode='after')
    def validate_options_logic(self) -> 'QuestionCreate':
        correct_count = sum(1 for o in self.options if o.is_correct)
        total_options = len(self.options)

        if correct_count != 1:
            raise ValueError("Cada pregunta debe tener exactamente una opción correcta.")
        
        if total_options < 2:
            raise ValueError("Cada pregunta debe tener al menos dos opciones en total.")
        
        if (total_options - correct_count) < 1:
            raise ValueError("Cada pregunta debe tener al menos una opción falsa.")

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
                        "options": [
                            {"text": "4", "is_correct": True},
                            {"text": "5", "is_correct": False}
                        ]
                    }
                ]
            }
        }
    )
    
