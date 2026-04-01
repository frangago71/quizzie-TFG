import React, { useState, useEffect } from 'react';
import { Timer, Users, HelpCircle, Eye, EyeOff, Send, ChevronRight, Check } from 'lucide-react';
import './LiveRoom.css';
import './QuestionResults.css';
import axios from 'axios';

interface LiveRoomProps {
    roomData: any;
    isHost: boolean;
    roomId: number;
    roomCode?: string;
    quizId?: number;
    participantId?: number | null;
    onUpdateData: (data: any) => void;
}

const LiveRoom: React.FC<LiveRoomProps> = ({ roomData, isHost, roomId, roomCode, quizId, participantId, onUpdateData }) => {
    const [phase, setPhase] = useState<'countdown' | 'playing'>('countdown');
    const [step, setStep] = useState<'reading' | 'answering'>('reading');
    const [count, setCount] = useState(3);
    const [timeLeft, setTimeLeft] = useState(5);
    const [quizTitle, setQuizTitle] = useState('');
    const [showAnswersCount, setShowAnswersCount] = useState(false);
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
    const [isSent, setIsSent] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [statistics, setStatistics] = useState<Record<string, number>>({});

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/content/rooms/${roomId}/ws`);
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (["next_question", "room_start", "room_update"].includes(message.type)) {
                onUpdateData(message.data);
                setShowResults(false);
                setPhase('playing');
                setStep('reading');
                setCount(0);
                setTimeLeft(5);
            }
            
            if (message.type === "show_results") {
                setStatistics(message.data.statistics);
                setShowResults(true);
            }

            if (message.type === "room_finish") {
                alert("¡Cuestionario finalizado!");
                window.location.href = '/';
            }
        };
        return () => ws.close();
    }, [roomId, onUpdateData]);

    useEffect(() => {
        setIsSent(false);
        setSelectedOptionId(null);
    }, [roomData.question_id]);

    const handleNextQuestion = async () => {
        try {
            await axios.patch(`http://localhost:8000/content/rooms/${roomId}/next-question`);
        } catch (error) {
            console.error("Error al pasar de pregunta:", error);
        }
    };

    const handleShowResults = async () => {
        try {
            await axios.post(`http://localhost:8000/content/rooms/${roomId}/questions/${roomData.question_id}/finish`);
        } catch (error) {
            console.error("Error al finalizar pregunta:", error);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!selectedOptionId || isSent || isHost || !participantId || !roomData?.question_id) return;
        try {
            await axios.post(`http://localhost:8000/content/answers`, null, {
                params: {
                    participant_id: participantId,
                    option_id: selectedOptionId,
                    question_id: roomData.question_id
                }
            });
            setIsSent(true);
        } catch (error) {
            console.error("Error al enviar:", error);
        }
    };

    useEffect(() => {
        const fetchQuizData = async () => {
            if (!quizId) return;
            try {
                const response = await axios.get(`http://localhost:8000/content/quizzes/${quizId}/`);
                setQuizTitle(response.data.name || response.data.title || 'Sin título');
            } catch (error) { console.error(error); }
        };
        fetchQuizData();
    }, [quizId]);

    useEffect(() => {
        if (phase === 'countdown') {
            if (count > 0) {
                const t = setTimeout(() => setCount(count - 1), 1000);
                return () => clearTimeout(t);
            } else {
                setPhase('playing');
                setTimeLeft(5);
            }
        }
    }, [count, phase]);

    useEffect(() => {
        if (phase === 'playing' && timeLeft >= 0) {
            const timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    setTimeLeft(prev => prev - 1);
                } else if (timeLeft === 0 && step === 'reading') {
                    setStep('answering');
                    setTimeLeft(40);
                }
            }, 1000);
            return () => clearInterval(timerInterval);
        }
    }, [phase, timeLeft, step]);

    const readingProgress = Math.min(100, ((5 - timeLeft) / 5) * 100);
    const answeringProgress = Math.min(100, ((40 - timeLeft) / 40) * 100);

    if (phase === 'countdown') {
        return (
            <div className="live-room-wrapper countdown-bg">
                <div className="countdown-card">
                    <h1 className="countdown-number animate-pop">{count}</h1>
                    <h2 className="countdown-title">¡Prepárate!</h2>
                </div>
            </div>
        );
    }

    if (showResults) {
        const totalVotes = Object.values(statistics).reduce((a, b) => a + b, 0);
        return (
            <div className="live-room-wrapper results-mode">
                <div className="results-container animate-fade-in">
                    <h1 className="results-title">{roomData.text}</h1>
                    <div className="stats-grid">
                        {roomData.options.map((opt: any, index: number) => (
                            <div key={opt.id} className="stat-column">
                                <span className="stat-count-big">{statistics[opt.id.toString()] || 0}</span>
                                <div className="stat-label-box">
                                    <span className="stat-letter-tag">Opción {String.fromCharCode(65 + index)}</span>
                                    <span className="stat-option-text">{opt.text}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="results-summary-row">
                        <div className="summary-card">
                            <div className="summary-icon-box bg-blue"><Users size={22} /></div>
                            <div className="summary-info">
                                <span className="summary-label">Votos totales</span>
                                <span className="summary-value">{totalVotes}</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-icon-box bg-green"><Check size={22} /></div>
                            <div className="summary-info">
                                <span className="summary-label">Precisión</span>
                                <span className="summary-value">-- %</span>
                            </div>
                        </div>
                        <div className="summary-card">
                            <div className="summary-icon-box bg-purple"><Timer size={22} /></div>
                            <div className="summary-info">
                                <span className="summary-label">Tiempo medio</span>
                                <span className="summary-value">-- s</span>
                            </div>
                        </div>
                    </div>
                    {isHost && (
                        <div className="results-actions">
                            <button className="btn-continue-host" onClick={handleNextQuestion}>
                                Siguiente pregunta <ChevronRight size={22} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`live-room-wrapper ${step === 'reading' ? 'reading-mode' : 'answering-mode'}`}>
            <div className="live-content-layout">
                {step === 'answering' && (
                    <header className="live-header animate-fade-in">
                        <div className="header-left-info">
                            <span className="header-pin-badge">PIN DE SALA: {roomCode}</span>
                            <h1 className="header-quiz-title">{quizTitle || "Responda a las preguntas"}</h1>
                        </div>
                        <div className="header-right-stats">
                            <div className="live-stat-badge">
                                {isHost ? (
                                    <button className="eye-toggle-btn" onClick={() => setShowAnswersCount(!showAnswersCount)}>
                                        {showAnswersCount ? <Eye size={20} /> : <EyeOff size={20} />}
                                    </button>
                                ) : <Users size={20} className="icon-magenta" />}
                                <div className="stat-texts">
                                    <span className="stat-label">RESPUESTAS</span>
                                    <span className="stat-number">{isHost ? (showAnswersCount ? 0 : "••") : "••"}</span>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                <div className="top-time-system animate-fade-in">
                    {step !== 'reading' && (
                        <div className="time-display-badge">
                            <Timer size={20} className="icon-magenta" />
                            <span className="time-text-large">{timeLeft}s</span>
                        </div>
                    )}
                    <div className="time-progress-container">
                        <div className="time-progress-bar" style={{ width: `${step === 'reading' ? readingProgress : answeringProgress}%` }} />
                    </div>

                    {isHost && step === 'answering' && (
                        <div className="host-timer-controls">
                            {timeLeft > 0 ? (
                                <button className="lr-btn-finish" onClick={() => setTimeLeft(0)}>Terminar tiempo</button>
                            ) : (
                                <button className="lr-btn-finish" onClick={handleShowResults}>
                                    <Eye size={18} /> Ver estadísticas
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <main className="live-main">
                    <section className="question-card">
                        <div className="question-header">
                            <div className="question-icon-box"><HelpCircle size={24} color="white" /></div>
                            <h2 className="question-text">{roomData.text}</h2>
                        </div>
                        {step === 'answering' && (
                            <div className="answering-area animate-fade-in">
                                <div className="options-grid">
                                    {roomData.options.map((opt: any, index: number) => (
                                        <button
                                            key={opt.id}
                                            disabled={isSent || isHost}
                                            className={`lr-option-item ${selectedOptionId === opt.id ? 'active' : ''}`}
                                            onClick={() => setSelectedOptionId(opt.id)}
                                        >
                                            <div className="option-letter-box">{String.fromCharCode(65 + index)}</div>
                                            <span className="option-text">{opt.text}</span>
                                        </button>
                                    ))}
                                </div>
                                {!isHost && (
                                    <div className="action-bar">
                                        <button
                                            className={`btn-send-answer ${!selectedOptionId ? 'not-selected' : ''} ${isSent ? 'is-sent' : ''}`}
                                            onClick={handleSubmitAnswer}
                                            disabled={!selectedOptionId || isSent}
                                        >
                                            {isSent ? <Check size={18} /> : <Send size={18} />}
                                            <span>{isSent ? 'Respuesta enviada' : 'Enviar respuesta'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
};

export default LiveRoom;