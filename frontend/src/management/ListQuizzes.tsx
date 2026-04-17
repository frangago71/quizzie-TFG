import api from '../api.ts';
import type { Quiz } from '../types.ts';
import './ListQuizzes.css';
import { useEffect, useState } from 'react';
import { Pencil, Trash2, Eye, Play, Plus, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext.tsx';

const ListQuizzes: React.FC = () => {
    const [teacherQuizzes, setTeacherQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    void loading;
    const teacherId = 1;
    const navigate = useNavigate();
    const { setRoomId } = useRoom();

    const useIsMobile = () => {
        const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

        useEffect(() => {
            const handleResize = () => setIsMobile(window.innerWidth <= 768);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);

        return isMobile;
    };

    const isMobile = useIsMobile();

    const parseDate = (dateStr: string | undefined) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES');
    };

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await api.get(`/users/${teacherId}/quizzes/`);
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
        <div className='list-quizzes-page'>
            <header className="list-header">
                <div className="header-titles">
                    <h1>Mis Cuestionarios</h1>
                    <p>Gestiona y lanza tus sesiones en tiempo real.</p>
                </div>
                <div className="filter-tabs">
                    <button className="tab active">Todos</button>
                    <button className="tab">Recientes</button>
                    <button className="tab">Borradores</button>
                </div>
            </header>

            <div className="quizzes-list-container">
                {teacherQuizzes.map((quiz) => (
                    <div key={quiz.id} className="quiz-horizontal-card">
                        <div className="quiz-image-container">
                            <img
                                src={`https://picsum.photos/seed/quiz-${quiz.id}/400/300`}
                                alt={quiz.title}
                                className="quiz-card-img"
                            />
                            {quiz.tags && (
                                <div className="tags-container">
                                    {(() => {
                                        const allTags = quiz.tags.split(',');
                                        const total = allTags.length;

                                        if (total <= 3) {
                                            return allTags.map((tag, index) => (
                                                <span key={index} className="category-tag">
                                                    {tag.trim()}
                                                </span>
                                            ));
                                        } else {
                                            return (
                                                <>
                                                    {allTags.slice(0, 2).map((tag, index) => (
                                                        <span key={index} className="category-tag">
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                    <span className="category-tag">
                                                        +{total - 2}
                                                    </span>
                                                </>
                                            );
                                        }
                                    })()}
                                </div>
                            )}
                        </div>
                        <div className="quiz-info-content">
                            {isMobile ? (
                                <>
                                    <div className="info-main-text">
                                        <h3>{quiz.title}</h3>
                                        <p className="quiz-description">{quiz.description}</p>
                                    </div>
                                    <div className="info-footer-row">
                                        <div className="meta-date">
                                            <Calendar size={14} color="#94a3b8" />
                                            <span>{parseDate(quiz.created_at ?? "")}</span>
                                        </div>
                                        <button className="btn-main small magenta" onClick={() => {
                                            setRoomId(quiz.id);
                                            navigate(`/quizzes/setup/${quiz.id}`);
                                        }}>
                                            <Play size={16} fill="white" />
                                            Crear sala
                                        </button>
                                    </div>
                                    <div className="action-icons">
                                        <button className="icon-btn" title="Editar"><Pencil size={18} /></button>
                                        <button className="icon-btn" title="Eliminar"><Trash2 size={18} /></button>
                                        <button className="icon-btn" title="Ver"><Eye size={18} /></button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="info-top">
                                        <h3>{quiz.title}</h3>
                                        <div className="action-icons">
                                            <button className="icon-btn" title="Editar"><Pencil size={18} /></button>
                                            <button className="icon-btn" title="Eliminar"><Trash2 size={18} /></button>
                                            <button className="icon-btn" title="Ver"><Eye size={18} /></button>
                                        </div>
                                    </div>
                                    <p className="quiz-description">{quiz.description}</p>
                                    <div className="info-bottom">
                                        <div className="meta-data">
                                            <div className="meta-item">
                                                <Calendar size={14} color="#94a3b8" />
                                                <span>{parseDate(quiz.created_at ?? "")}</span>
                                            </div>
                                        </div>
                                        <button className="btn-main small magenta" onClick={() => {
                                            setRoomId(quiz.id);
                                            navigate(`/quizzes/setup/${quiz.id}`);
                                        }}>
                                            <Play size={16} fill="white" />
                                            Crear sala
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}

                <div className="create-new-dashed" onClick={() => navigate('/quizzes/create')}>
                    <div className="dashed-content">
                        <div className="plus-icon-container">
                            <Plus size={28} color="#64748b" />
                        </div>
                        <h3>Crear un nuevo cuestionario</h3>
                        <p>Diseña un set de preguntas personalizado para tus alumnos.</p>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ListQuizzes;