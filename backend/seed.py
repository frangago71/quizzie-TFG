from sqlmodel import Session, SQLModel, delete, select

from auth import get_password_hash
from database import engine
from models.content import Option, Question, Quiz
from models.stage import Answer, Participant, Room, RoomStatus
from models.users import Group, Student, Teacher


def clear_database():
    with Session(engine) as session:
        for table in [Answer, Participant, Room, Student, Option, Question, Quiz, Group, Teacher]:
            session.exec(delete(table))
        session.commit()


def create_seed_data():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        password = get_password_hash("123456")
        # --- 1. PROFESORES ---
        t1 = Teacher(
            username="Miguel de Cervantes", email="cervantes@quizzie.com", hashed_password=password
        )
        t2 = Teacher(
            username="Santiago Ramon y Cajal",
            email="ramonycajal@quizzie.com",
            hashed_password=password,
        )
        t3 = Teacher(
            username="Andres Iniesta", email="iniesta@quizzie.com", hashed_password=password
        )
        t4 = Teacher(username="Chema Alonso", email="alonso@quizzie.com", hashed_password=password)
        session.add_all([t1, t2, t3, t4])
        session.commit()
        for t in [t1, t2, t3, t4]:
            session.refresh(t)

        # --- 2. GRUPOS ---
        g_cervantes = Group(name="Grupo Cervantes", teacher_id=t1.id)
        g_cajal = Group(name="Grupo Ramón y Cajal", teacher_id=t2.id)
        session.add_all([g_cervantes, g_cajal])
        session.commit()
        session.refresh(g_cervantes)
        session.refresh(g_cajal)

        # --- 3. ESTUDIANTES ---
        all_students = []
        # Cervantes: 40 alumnos (cer0001 a cer0040)
        for i in range(1, 41):
            s = Student(name=f"cer{str(i).zfill(4)}", group_id=g_cervantes.id)
            session.add(s)
            all_students.append(s)
        for i in range(1, 11):
            s = Student(name=f"ryc{str(i).zfill(4)}", group_id=g_cajal.id)
            session.add(s)
            all_students.append(s)
        # Iniesta: 10 alumnos (ini0001 a ini0010)
        for i in range(1, 11):
            s = Student(name=f"ini{str(i).zfill(4)}", group_id=None)
            session.add(s)
            all_students.append(s)
        # Chema Alonso: 10 alumnos (alo0001 a alo0010)
        for i in range(1, 11):
            s = Student(name=f"alo{str(i).zfill(4)}", group_id=None)
            session.add(s)
            all_students.append(s)
        # Resto: 12 alumnos (abc0001 a abc0012)
        for i in range(1, 13):
            s = Student(name=f"abc{str(i).zfill(4)}", group_id=None)
            session.add(s)
            all_students.append(s)

        session.commit()
        for s in all_students:
            session.refresh(s)

        # --- 4. CUESTIONARIOS ---
        quiz_lengua = Quiz(
            title="Lengua Española Básica", description="Ortografía y gramática", teacher_id=t1.id
        )
        quiz_ciencias = Quiz(
            title="Ciencias de la Naturaleza", description="Nivel primaria", teacher_id=t2.id
        )
        quiz_deporte = Quiz(
            title="Deportes y Reglas", description="Iniciación deportiva", teacher_id=t3.id
        )
        quiz_informatica = Quiz(
            title="Informática Básica", description="Hardware y Software", teacher_id=t4.id
        )
        quiz_lengua_sin_sala_1 = Quiz(
            title="Lengua Española Avanzada",
            description="Literatura y análisis sintáctico",
            teacher_id=t1.id,
        )
        quiz_lengua_sin_sala_2 = Quiz(
            title="Literatura Universal", description="Obras y autores clásicos", teacher_id=t1.id
        )
        quiz_lengua_sin_sala_3 = Quiz(
            title="Gramática Española",
            description="Reglas gramaticales y sintaxis",
            teacher_id=t1.id,
        )

        session.add_all(
            [
                quiz_lengua,
                quiz_ciencias,
                quiz_deporte,
                quiz_informatica,
                quiz_lengua_sin_sala_1,
                quiz_lengua_sin_sala_2,
                quiz_lengua_sin_sala_3,
            ]
        )
        session.commit()
        for qz in [
            quiz_lengua,
            quiz_ciencias,
            quiz_deporte,
            quiz_informatica,
            quiz_lengua_sin_sala_1,
            quiz_lengua_sin_sala_2,
            quiz_lengua_sin_sala_3,
        ]:
            session.refresh(qz)

        # --- 5. PREGUNTAS ---
        # Lengua
        ql1 = Question(text="¿Cuál de estas es un sustantivo?", points=5, quiz_id=quiz_lengua.id)
        ql2 = Question(text="¿Qué tipo de palabra es 'Cantar'?", points=5, quiz_id=quiz_lengua.id)
        # Ciencias
        qc1 = Question(
            text="¿Qué gas necesitamos para respirar?", points=5, quiz_id=quiz_ciencias.id
        )
        qc2 = Question(
            text="¿Cuál es el planeta más cercano al Sol?", points=5, quiz_id=quiz_ciencias.id
        )
        # Deporte
        qd1 = Question(
            text="¿Cuántos jugadores hay en un equipo de fútbol?", points=5, quiz_id=quiz_deporte.id
        )
        qd2 = Question(
            text="¿En qué deporte se utiliza una raqueta?", points=5, quiz_id=quiz_deporte.id
        )
        # Informática
        qi1 = Question(text="¿Cuál es un sistema operativo?", points=5, quiz_id=quiz_informatica.id)
        qi2 = Question(
            text="¿Qué componente es el 'cerebro' del ordenador?",
            points=5,
            quiz_id=quiz_informatica.id,
        )
        # Lengua sin sala (1)
        qlss1_1 = Question(
            text="¿Cuál es el sujeto en la frase 'El perro corre rápido'?",
            points=5,
            quiz_id=quiz_lengua_sin_sala_1.id,
        )
        qlss1_2 = Question(
            text="¿Cuál es el predicado en la frase 'El perro corre rápido'?",
            points=5,
            quiz_id=quiz_lengua_sin_sala_1.id,
        )
        # Lengua sin sala (2)
        qlss2_1 = Question(
            text="¿Quién escribió 'Don Quijote de la Mancha'?",
            points=5,
            quiz_id=quiz_lengua_sin_sala_2.id,
        )
        qlss2_2 = Question(
            text="¿En qué siglo se publicó 'Don Quijote de la Mancha'?",
            points=5,
            quiz_id=quiz_lengua_sin_sala_2.id,
        )
        # Lengua sin sala (3)
        qlss3_1 = Question(
            text="¿Cuál es la función de una preposición?",
            points=5,
            quiz_id=quiz_lengua_sin_sala_3.id,
        )

        session.add_all(
            [ql1, ql2, qc1, qc2, qd1, qd2, qi1, qi2, qlss1_1, qlss1_2, qlss2_1, qlss2_2, qlss3_1]
        )
        session.commit()
        for qn in [
            ql1,
            ql2,
            qc1,
            qc2,
            qd1,
            qd2,
            qi1,
            qi2,
            qlss1_1,
            qlss1_2,
            qlss2_1,
            qlss2_2,
            qlss3_1,
        ]:
            session.refresh(qn)

        # --- 6. OPCIONES ---
        # Lengua
        session.add_all(
            [
                Option(text="Perro", is_correct=True, question_id=ql1.id),
                Option(text="Correr", is_correct=False, question_id=ql1.id),
                Option(text="Rápido", is_correct=False, question_id=ql1.id),
                Option(text="Saltar", is_correct=False, question_id=ql1.id),
                Option(text="Rápidamente", is_correct=False, question_id=ql1.id),
                Option(text="De", is_correct=False, question_id=ql1.id),
            ]
        )
        session.add_all(
            [
                Option(text="Verbo", is_correct=True, question_id=ql2.id),
                Option(text="Adjetivo", is_correct=False, question_id=ql2.id),
                Option(text="Preposición", is_correct=False, question_id=ql2.id),
                Option(text="Adverbio", is_correct=False, question_id=ql2.id),
            ]
        )
        # Ciencias
        session.add_all(
            [
                Option(text="Oxígeno", is_correct=True, question_id=qc1.id),
                Option(text="Nitrógeno", is_correct=False, question_id=qc1.id),
                Option(text="Helio", is_correct=False, question_id=qc1.id),
            ]
        )
        session.add_all(
            [
                Option(text="Marte", is_correct=False, question_id=qc2.id),
                Option(text="Venus", is_correct=False, question_id=qc2.id),
                Option(text="Júpiter", is_correct=False, question_id=qc2.id),
                Option(text="Saturno", is_correct=False, question_id=qc2.id),
                Option(text="Mercurio", is_correct=True, question_id=qc2.id),
                Option(text="Neptuno", is_correct=False, question_id=qc2.id),
                Option(text="Urano", is_correct=False, question_id=qc2.id),
                Option(text="La Tierra", is_correct=False, question_id=qc2.id),
            ]
        )
        # Deporte
        session.add_all(
            [
                Option(text="10", is_correct=False, question_id=qd1.id),
                Option(text="9", is_correct=False, question_id=qd1.id),
                Option(text="11", is_correct=True, question_id=qd1.id),
                Option(text="12", is_correct=False, question_id=qd1.id),
            ]
        )
        session.add_all(
            [
                Option(text="Fútbol", is_correct=False, question_id=qd2.id),
                Option(text="Baloncesto", is_correct=False, question_id=qd2.id),
                Option(text="Tenis", is_correct=True, question_id=qd2.id),
            ]
        )
        # Informática
        session.add_all(
            [
                Option(text="Windows", is_correct=True, question_id=qi1.id),
                Option(text="WhatsApp", is_correct=False, question_id=qi1.id),
            ]
        )
        session.add_all(
            [
                Option(text="CPU", is_correct=True, question_id=qi2.id),
                Option(text="RAM", is_correct=False, question_id=qi2.id),
                Option(text="Gráfica", is_correct=False, question_id=qi2.id),
                Option(text="Ratón", is_correct=False, question_id=qi2.id),
            ]
        )
        # Lengua sin sala (1)
        session.add_all(
            [
                Option(text="El perro", is_correct=True, question_id=qlss1_1.id),
                Option(text="corre", is_correct=False, question_id=qlss1_1.id),
                Option(text="rápido", is_correct=False, question_id=qlss1_1.id),
            ]
        )
        session.add_all(
            [
                Option(text="El perro", is_correct=False, question_id=qlss1_2.id),
                Option(text="corre", is_correct=True, question_id=qlss1_2.id),
                Option(text="rápido", is_correct=False, question_id=qlss1_2.id),
            ]
        )
        # Lengua sin sala (2)
        session.add_all(
            [
                Option(text="Miguel de Cervantes", is_correct=True, question_id=qlss2_1.id),
                Option(text="William Shakespeare", is_correct=False, question_id=qlss2_1.id),
                Option(text="Gabriel García Márquez", is_correct=False, question_id=qlss2_1.id),
            ]
        )
        session.add_all(
            [
                Option(text="Siglo XVII", is_correct=True, question_id=qlss2_2.id),
                Option(text="Siglo XVIII", is_correct=False, question_id=qlss2_2.id),
                Option(text="Siglo XIX", is_correct=False, question_id=qlss2_2.id),
            ]
        )
        # Lengua sin sala (3)
        session.add_all(
            [
                Option(
                    text="Unen palabras y establecen relaciones entre ellas",
                    is_correct=True,
                    question_id=qlss3_1.id,
                ),
                Option(
                    text="Explican el significado de las palabras",
                    is_correct=False,
                    question_id=qlss3_1.id,
                ),
                Option(
                    text="Modifican el valor de las palabras",
                    is_correct=False,
                    question_id=qlss3_1.id,
                ),
            ]
        )

        session.commit()

        # --- 7. SALAS ---
        # 2 Salas WAITING, 1 LIVE, 1 VERIFYING y 1 FINISHED
        r_waiting1 = Room(
            join_code="111111",
            status=RoomStatus.WAITING,
            teacher_id=t1.id,
            quiz_id=quiz_lengua.id,
            group_id=g_cervantes.id,
        )
        r_waiting2 = Room(
            join_code="222222",
            status=RoomStatus.WAITING,
            teacher_id=t2.id,
            quiz_id=quiz_ciencias.id,
            group_id=g_cajal.id,
        )
        r_live = Room(
            join_code="333333",
            status=RoomStatus.LIVE,
            teacher_id=t3.id,
            quiz_id=quiz_deporte.id,
            current_question_index=1,
        )
        r_finished = Room(
            join_code="444444", status=RoomStatus.FINISHED, teacher_id=t1.id, quiz_id=quiz_lengua.id
        )
        r_verifying = Room(
            join_code="555555",
            status=RoomStatus.VERIFYING,
            teacher_id=t4.id,
            quiz_id=quiz_informatica.id,
        )

        session.add_all([r_waiting1, r_waiting2, r_live, r_finished, r_verifying])
        session.commit()
        for r in [r_waiting1, r_waiting2, r_live, r_finished, r_verifying]:
            session.refresh(r)

        # --- 8. PARTICIPANTES ---
        for i in range(0, 40):
            session.add(
                Participant(
                    student_id=all_students[i].id,
                    score=i % 10,
                    room_id=r_waiting1.id,
                    is_verified=False,
                )
            )

        for i in range(40, 45):
            session.add(
                Participant(
                    student_id=all_students[i].id,
                    score=i % 10,
                    room_id=r_waiting2.id,
                    is_verified=False,
                )
            )

        for i in range(50, 55):
            session.add(
                Participant(
                    student_id=all_students[i].id,
                    score=i % 10,
                    room_id=r_live.id,
                    is_verified=False,
                )
            )

        fin_parts = []
        for i in range(60, 70):
            p = Participant(
                student_id=all_students[i].id, score=i % 10, room_id=r_finished.id, is_verified=True
            )
            session.add(p)
            fin_parts.append(p)

        session.add(
            Participant(
                student_id=all_students[71].id,
                score=i % 10,
                room_id=r_verifying.id,
                is_verified=False,
            )
        )
        session.add(
            Participant(
                student_id=all_students[72].id,
                score=i % 10,
                room_id=r_verifying.id,
                is_verified=True,
            )
        )

        session.commit()
        for p in fin_parts:
            session.refresh(p)

        # --- 9. RESPUESTAS ---
        qs_fin = session.exec(select(Question).where(Question.quiz_id == quiz_lengua.id)).all()
        for q_f in qs_fin:
            opts = session.exec(select(Option).where(Option.question_id == q_f.id)).all()
            correct = next(o for o in opts if o.is_correct)
            wrong = next(o for o in opts if not o.is_correct)
            for idx, p in enumerate(fin_parts):
                is_ok = idx >= 2
                session.add(
                    Answer(
                        points_earned=q_f.points if is_ok else 0,
                        was_correct=is_ok,
                        participant_id=p.id,
                        room_id=r_finished.id,
                        question_id=q_f.id,
                        option_id=correct.id if is_ok else wrong.id,
                    )
                )

        session.commit()
        print("Base de datos poblada correctamente.")


if __name__ == "__main__":
    create_seed_data()
