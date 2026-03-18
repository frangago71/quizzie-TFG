import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './SetupRoom.css';
import { Calendar, Shuffle, ListTree, Trophy, ChevronLeft, Rocket } from 'lucide-react';

interface SetupRoomProps {
    quizId: number | null;
    onOpenSession: (joinCode: string, roomId: number) => void;
    onBack: () => void;
}

const SetupRoom: React.FC<SetupRoomProps> = ({ quizId, onOpenSession, onBack }) => {
    const [quiz, setQuiz] = useState<any>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (quizId) {
            axios.get(`http://localhost:8000/content/quizzes/${quizId}`)
                .then(res => setQuiz(res.data))
                .catch(err => console.error("Error cargando quiz:", err));
        }
    }, [quizId]);

    const parseDate = (dateStr: string) => {
        if (!dateStr) return "Sin fecha";
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    };

    const handleOpenSession = async () => {
        if (!quizId) {
            alert("ID de cuestionario no válido.");
            return;
        }
        setIsCreating(true);
        try {
            const response = await axios.post(`http://localhost:8000/content/rooms`, null, {
                params: { quiz_id: quizId }
            });
            alert("¡Sala creada con éxito! Código de acceso: " + response.data.join_code);
            onOpenSession(response.data.join_code, response.data.id);
        } catch (error: any) {
            if (error.response) {
                const status = error.response.status;
                const detail = error.response.data?.detail;
                if (status === 400) {
                    alert(detail || "No se puede crear la sala. Verifica si ya tienes una sala activa para este cuestionario.");
                } else if (status === 404) {
                    alert("El cuestionario seleccionado no existe.");
                } else {
                    alert(`Error ${status}: ${detail || "Error inesperado"}`);
                }
            } else {
                alert("No hay respuesta del servidor.?");
            }
        } finally {
            setIsCreating(false);
        }
    };

    if (!quiz) return <div className="setup-wrapper setup-loading">Cargando detalles...</div>;

    return (
        <div className="setup-wrapper">
            {!isMobile && (
                <button className="back-nav" onClick={onBack}>
                    <ChevronLeft size={20} /> Volver a cuestionarios
                </button>
            )}
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
            </div>
            <div className="setup-external-actions">
                <button
                    className={`btn-main magenta ${isCreating ? 'disabled' : ''}`}
                    onClick={handleOpenSession}
                    disabled={isCreating}
                >
                    <Rocket size={20} /> {isCreating ? 'Creando sala...' : 'Crear sala'}
                </button>
                {isMobile && (
                    <button className="back-nav" onClick={onBack}>
                        <ChevronLeft size={20} /> Volver a cuestionarios
                    </button>
                )}
                <p className="action-hint">Se generará un código de acceso una vez creada la sala.</p>
            </div>
        </div>
    );
};

export default SetupRoom;