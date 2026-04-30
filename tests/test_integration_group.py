import pytest
from fastapi.testclient import TestClient
from models.users import Teacher, Group

class TestGroupIntegration:
    def test_get_groups(self, client: TestClient, session):
        """
        Listado de grupos.
        """
        teacher = Teacher(id=50, username="t_g", email="tg@t.com", hashed_password="x")
        session.add(teacher)
        session.commit()
        session.add(Group(name="Grupo A", teacher_id=50))
        session.commit()

        res = client.get("/users/groups")
        assert res.status_code == 200
        assert len(res.json()) >= 1
        assert any(g["name"] == "Grupo A" for g in res.json())
