import pytest

class TestQuizIntegration:
    """
    Pruebas de Integración del modelo Quiz, Question y Option para validar las reglas de negocio y restricciones.
    """

    def test_create_and_get_quiz_flow(self, client):
        """Validar el ciclo completo: Crear un quiz y luego recuperarlo por ID."""
        payload = {
            "title": "Cuestionario de Integración",
            "description": "Probando la persistencia",
            "questions": [
                {
                    "text": "¿Funciona la integración?",
                    "points": 10,
                    "options": [
                        {"text": "Sí", "is_correct": True},
                        {"text": "No", "is_correct": False}
                    ]
                }
            ]
        }
        post_response = client.post("/content/quizzes", json=payload)
        assert post_response.status_code == 201
        quiz_id = post_response.json()["quiz_id"]
        get_response = client.get(f"/content/quizzes/{quiz_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["title"] == "Cuestionario de Integración"
        assert len(data["questions"]) == 1
        assert data["questions"][0]["text"] == "¿Funciona la integración?"

    def test_get_quiz_not_found(self, client):
        """Verificar el error 404 al buscar un quiz inexistente."""
        response = client.get("/content/quizzes/999")
        assert response.status_code == 404
        assert response.json()["detail"] == "Quiz no encontrado"

    def test_post_quiz_validation_error(self, client):
        """Verificar que FastAPI/Pydantic bloqueen un JSON malformado (sin título)."""
        bad_payload = {
            "description": "Falta el título",
            "questions": []
        }
        response = client.post("/content/quizzes", json=bad_payload)
        assert response.status_code == 422

    def test_get_all_quizzes_empty(self, client):
        """Verificar que el listado inicial esté vacío en una BD nueva."""
        response = client.get("/content/quizzes")
        assert response.status_code == 200
        assert response.json() == []