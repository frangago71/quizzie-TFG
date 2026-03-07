import axios from 'axios';
import type { Quiz } from '../types';
import './ListQuizzes.css';
import { useEffect, useState, } from 'react';


const ListQuizzes: React.FC = () => {
    const [teacherQuizzes, setTeacherQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    const teacherId = 1; // Se modificará cuando se implemente la gestión de usuarios

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/users/${teacherId}/quizzes/`);
                setTeacherQuizzes(response.data);
            } catch (error) {
                console.error("Error cargando los quizzes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    return (
        <div className='list-quizzes-container'>
            <h2>Lista de Cuestionarios</h2>
            <p>Aquí se mostrarán los cuestionarios disponibles.</p>
            <div className="quizzes-grid">
                {teacherQuizzes.map((quiz) => (
                    <div key={quiz.id} className="quiz-list-card">
                        <h3>{quiz.title}</h3>
                        <p>{quiz.description}</p>
                        <button className="btn-edit">Editar</button>
                    </div>
                ))}

                {teacherQuizzes.length === 0 && !loading && (
                    <p>Aún no has creado ningún cuestionario. ¡Empieza ahora!</p>
                )}
            </div>
        </div>


    );
};

export default ListQuizzes;