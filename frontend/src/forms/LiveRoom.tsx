import React, { useState, useEffect } from 'react';
import { Timer, Users, HelpCircle, Eye, EyeOff, Send, ChevronRight, Check, XCircle, MinusCircle, Target, TrendingUp, TrendingDown } from 'lucide-react';
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
    const [correctOptionId, setCorrectOptionId] = useState<number | null>(null);

    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:8000/content/rooms/${roomId}/ws`);
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (["next_question", "room_start", "room_update"].includes(message.type)) {
                onUpdateData(message.data);
                setShowResults(false);
                setCorrectOptionId(null);
                setPhase('playing');
                setStep('reading');
                setCount(0);
                setTimeLeft(5);
            }

            if (message.type === "show_results") {
                setStatistics(message.data.statistics);
                setCorrectOptionId(message.data.correct_option_id);
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

    const handleShowResults = async () => {
        try {
            await axios.post(`http://localhost:8000/content/rooms/${roomId}/questions/${roomData.question_id}/finish`);
        } catch (error) {
            console.error("Error al finalizar pregunta:", error);
        }
    };

    const handleNextQuestion = async () => {
        try {
            await axios.patch(`http://localhost:8000/content/rooms/${roomId}/next-question`);
        } catch (error) {
            console.error("Error al pasar de pregunta:", error);
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
        if (phase === 'countdown' && count > 0) {
            const t = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(t);
        } else if (phase === 'countdown' && count === 0) {
            setPhase('playing');
            setTimeLeft(5);
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
        const maxVotes = Math.max(...Object.values(statistics), 0);
        const winners = Object.keys(statistics).filter(id => statistics[id] === maxVotes);
        const isTie = winners.length > 1 || totalVotes === 0;
        const winningOptionId = winners.length === 1 ? winners[0] : null;
        const isConsensusCorrect = !isTie && winningOptionId === correctOptionId?.toString();
        const userIsCorrect = selectedOptionId === correctOptionId;

        return (
            <div className="live-room-wrapper results-mode">
                <div className="results-container animate-fade-in">
                    <h1 className="results-title">{roomData.text}</h1>
                    <div className="chart-main-container">
                        <div className="chart-area">
                            {roomData.options.map((opt: any, index: number) => {
                                const votes = statistics[opt.id.toString()] || 0;
                                const barHeight = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
                                const isCorrect = opt.id === correctOptionId;
                                const isSelected = opt.id === selectedOptionId;

                                let barColor = "#e2e8f0";
                                if (isSelected && isCorrect) barColor = "var(--color-green)";
                                else if (isSelected && !isCorrect) barColor = "var(--color-red)";
                                else if (!isSelected && isCorrect) barColor = "var(--color-blue)";

                                return (
                                    <div key={opt.id} className="chart-column">
                                        <div className="bar-wrapper">
                                            <span className="bar-count" style={{ color: barColor }}>{votes}</span>
                                            <div className="bar-track">
                                                <div className="bar-fill" style={{ height: `${barHeight}%`, backgroundColor: barColor }} />
                                            </div>
                                        </div>
                                        <div className="bar-info">
                                            <span className="bar-option-letter"> {String.fromCharCode(65 + index)}</span>
                                            <span className="bar-option-text">{opt.text}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="results-summary-row">
                        <div className="summary-card">
                            <div className="summary-icon-box bg-blue-soft">
                                <Users size={22} color="var(--color-blue)" />
                            </div>
                            <div className="summary-data">
                                <span className="summary-label">PARTICIPACIÓN</span>
                                <span className="summary-value">{totalVotes} alumnos</span>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className={`summary-icon-box ${isHost
                                    ? (isTie ? 'bg-gray-soft' : (isConsensusCorrect ? 'bg-green-soft' : 'bg-red-soft'))
                                    : (!selectedOptionId ? 'bg-gray-soft' : (userIsCorrect ? 'bg-green-soft' : 'bg-red-soft'))
                                }`}>
                                {isHost ? (
                                    isTie ? <MinusCircle size={22} color="#94a3b8" /> : (isConsensusCorrect ? <TrendingUp size={22} color="var(--color-green)" /> : <TrendingDown size={22} color="var(--color-red)" />)
                                ) : (
                                    !selectedOptionId ? <MinusCircle size={22} color="#94a3b8" /> : (userIsCorrect ? <Check size={22} color="var(--color-green)" /> : <XCircle size={22} color="var(--color-red)" />)
                                )}
                            </div>
                            <div className="summary-data">
                                <span className="summary-label">{isHost ? "OPCIÓN MÁS VOTADA" : "TU RESULTADO"}</span>
                                <span className="summary-value">
                                    {isHost
                                        ? (isTie ? "---" : `Opción ${String.fromCharCode(65 + roomData.options.findIndex((o: any) => o.id.toString() === winningOptionId))}`)
                                        : (!selectedOptionId ? "Sin voto" : (userIsCorrect ? "¡Correcto!" : "Fallaste"))
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="summary-card">
                            <div className="summary-icon-box bg-purple-soft">
                                <Target size={22} color="var(--color-purple)" />
                            </div>
                            <div className="summary-data">
                                <span className="summary-label">ÉXITO GLOBAL</span>
                                <span className="summary-value">
                                    {totalVotes > 0 ? Math.round(((statistics[correctOptionId?.toString() || ''] || 0) / totalVotes) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {isHost && (
                        <div className="results-actions">
                            <button className="btn-continue-host" onClick={handleNextQuestion}>
                                Continuar <ChevronRight size={22} />
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
                                    <span className="stat-number">
                                        {isHost ? (showAnswersCount ? Object.values(statistics).reduce((a, b) => a + b, 0) : "••") : "••"}
                                    </span>
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