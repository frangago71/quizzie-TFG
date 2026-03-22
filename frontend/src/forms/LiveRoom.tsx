import React, { useState, useEffect } from 'react';
import { Timer, Users, HelpCircle, Eye, EyeOff, Send } from 'lucide-react';
import './LiveRoom.css';
import axios from 'axios';

interface LiveRoomProps {
    roomData: any;
    isHost: boolean;
    roomId: number;
    roomCode?: string;
    quizId?: number;
}

// const LiveRoom: React.FC<LiveRoomProps> = ({ roomData, isHost, roomId, roomCode, quizId }) => {
const LiveRoom: React.FC<LiveRoomProps> = ({ roomData, isHost, roomCode, quizId }) => {
    const [phase, setPhase] = useState<'countdown' | 'playing'>('countdown');
    const [step, setStep] = useState<'reading' | 'answering'>('reading');
    const [count, setCount] = useState(3);
    const [timeLeft, setTimeLeft] = useState(5);
    const [quizTitle, setQuizTitle] = useState('');
    const [showAnswersCount, setShowAnswersCount] = useState(false);
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
    const [isSent, setIsSent] = useState(false);

    const currentAnswersCount = 0;

    useEffect(() => {
        const fetchQuizData = async () => {
            if (!quizId) return;
            try {
                const response = await axios.get(`http://localhost:8000/content/quizzes/${quizId}/`);
                setQuizTitle(response.data.name || response.data.title || 'Sin título');
            } catch (error) {
                console.error("Error buscando el título:", error);
            }
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
                    <div className="countdown-number">
                        <h1 className="countdown-number animate-pop">{count}</h1>
                    </div>
                    <h2 className="countdown-title">¡Prepárate!</h2>
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
                                        {isHost ? (showAnswersCount ? currentAnswersCount : "••") : currentAnswersCount}
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
                        <div
                            className="time-progress-bar"
                            style={{ width: `${step === 'reading' ? readingProgress : answeringProgress}%` }}
                        />
                    </div>

                    {isHost && step === 'answering' && (
                        <button className="lr-btn-finish" onClick={() => setTimeLeft(0)}>
                            Terminar
                        </button>
                    )}
                </div>

                <main className="live-main">
                    <section className="question-card">
                        <div className="question-header">
                            <div className="question-icon-box">
                                <HelpCircle size={24} color="white" />
                            </div>
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
                                            className={`btn-send-answer ${(!selectedOptionId || isSent) ? 'disabled' : ''}`}
                                            onClick={() => setIsSent(true)}
                                            disabled={!selectedOptionId || isSent}
                                        >
                                            <Send size={18} /> {isSent ? 'Respuesta enviada' : 'Enviar respuesta'}
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