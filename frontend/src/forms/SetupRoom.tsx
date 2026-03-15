import React, { useEffect, useState } from 'react';
import './SetupRoom.css';
import { Calendar, Shuffle, ListTree, Trophy, ChevronLeft, Rocket } from 'lucide-react';

interface SetupRoomProps {
    quizId: number | null;
    onOpenSession: (joinCode: string) => void;
    onBack: () => void;
}

const SetupRoom: React.FC<SetupRoomProps> = ({ quizId, onOpenSession, onBack }) => {
    const [quiz, setQuiz] = useState<any>(null);

    useEffect(() => {
        if (quizId) {
            fetch(`http://localhost:8000/content/quizzes/${quizId}`)
                .then(res => res.json())
                .then(data => setQuiz(data))
                .catch(err => console.error("Error cargando quiz:", err));
        }
    }, [quizId]);

    const parseDate = (dateStr: string) => {
        if (!dateStr) return "Sin fecha";
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    };

    const handleOpenSession = async () => {
        if (!quizId) return;
        try {
            const response = await fetch(`http://localhost:8000/content/rooms?quiz_id=${quizId}`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error("Error al crear la sala");
            const data = await response.json();
            onOpenSession(data.join_code);
        } catch (error) {
            alert("Error: " + error);
        }
    };

    if (!quiz) return <div className="setup-wrapper setup-loading">Cargando detalles...</div>;

    return (
        <div className="setup-wrapper">
            <button className="back-nav" onClick={onBack}>
                <ChevronLeft size={20} /> Volver a cuestionarios
            </button>

            <div className="setup-main-container">
                <div className="quiz-horizontal-card setup-header-card full-width">
                    <div className="quiz-image-container">
                        <img
                            src={`https://picsum.photos/seed/quiz-${quiz.id}/400/300`}
                            alt={quiz.title}
                            className="quiz-card-img"
                        />
                        {quiz.tags && (
                            <div className="tags-container">
                                {quiz.tags.split(',').slice(0, 3).map((tag: string, index: number) => (
                                    <span key={index} className="category-tag">{tag.trim()}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="quiz-info-content">
                        <h3>{quiz.title}</h3>
                        <p className="quiz-description">{quiz.description}</p>
                        <div className="info-bottom">
                            <div className="meta-item">
                                <Calendar size={14} color="#94a3b8" />
                                <span>{parseDate(quiz.created_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="setup-narrow-content">
                    <section className="settings-container">
                        <h3 className="settings-section-title">Configuración de la partida</h3>


                        <div className="setting-control locked">
                            <div className="setting-left">
                                <div className="setting-icon-wrapper">
                                    <Shuffle size={20} color="var(--primary-magenta)" />
                                </div>
                                <div className="setting-info-text">
                                    <span className="setting-title">Preguntas aleatorias</span>
                                    <span className="setting-desc">Cambia el orden de las preguntas para cada alumno</span>
                                </div>
                            </div>
                            <div className="switch-mock off"></div>
                        </div>

                        <div className="setting-control locked">
                            <div className="setting-left">
                                <div className="setting-icon-wrapper">
                                    <ListTree size={20} color="var(--primary-magenta)" />
                                </div>
                                <div className="setting-info-text">
                                    <span className="setting-title">Opciones aleatorias</span>
                                    <span className="setting-desc">Desordena las respuestas (A, B, C, D)</span>
                                </div>
                            </div>
                            <div className="switch-mock off"></div>
                        </div>

                        <div className="setting-control locked">
                            <div className="setting-left">
                                <div className="setting-icon-wrapper">
                                    <Trophy size={20} color="var(--primary-magenta)" />
                                </div>
                                <div className="setting-info-text">
                                    <span className="setting-title">Mostrar leaderboard</span>
                                    <span className="setting-desc">Ranking de alumnos tras cada pregunta</span>
                                </div>
                            </div>
                            <div className="switch-mock off"></div>
                        </div>
                    </section>
                </div>
            </div > 
            <div className="setup-external-actions">
                <button className="btn-main magenta" onClick={handleOpenSession}>
                    <Rocket size={20} /> Crear sala
                </button>
                <p className="action-hint">Se generará un código de acceso una vez creada la sala.</p>
            </div>
        </div >
    );

};

export default SetupRoom;