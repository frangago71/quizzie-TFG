import React from "react";
import type { RoomData, RoomOption } from "../types.ts";

import {
  Timer,
  Users,
  HelpCircle,
  Eye,
  EyeOff,
  Send,
  Check,
} from "lucide-react";
import "./AnsweringPhase.css";

interface AnsweringPhaseProps {
  phase: "countdown" | "playing";
  count: number;
  roomCode: string;
  quizTitle: string;
  showAnswersCount: boolean;
  setShowAnswersCount: (val: boolean) => void;
  isHost: boolean;
  statistics: Record<string, number>;
  timeLeft: number;
  isPaused: boolean;

  answeringProgress: number;
  handleShowResults: () => void;

  roomData: RoomData;

  selectedOptionId: number | null;
  setSelectedOptionId: (id: number | null) => void;
  isSent: boolean;
  handleSubmitAnswer: () => void;
  handleStopTimer: () => void;
}

const AnsweringPhase: React.FC<AnsweringPhaseProps> = ({
  phase,
  count,
  roomCode,
  quizTitle,
  showAnswersCount,
  setShowAnswersCount,
  isHost,
  statistics,
  timeLeft,
  isPaused,
  answeringProgress,
  handleShowResults,

  roomData,
  selectedOptionId,
  setSelectedOptionId,
  isSent,
  handleSubmitAnswer,
  handleStopTimer,
}) => {
  if (phase === "countdown") {
    return (
      <div className="live-room-wrapper countdown-bg">
        <div className="countdown-card">
          <h1 className="countdown-number animate-pop">{count}</h1>
          <h2 className="countdown-title">¡Prepárate!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="live-room-wrapper answering-mode">
      <div className="live-content-layout">
        <header className="live-header animate-fade-in">
          <div className="header-left-info">
            <span className="header-pin-badge">PIN DE SALA: {roomCode}</span>
            <h1 className="header-quiz-title">
              {quizTitle || "Responda a las preguntas"}
            </h1>
          </div>
          <div className="header-right-stats">
            <div className="live-stat-badge">
              {isHost ? (
                <button
                  className="eye-toggle-btn"
                  onClick={() => setShowAnswersCount(!showAnswersCount)}
                >
                  {showAnswersCount ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              ) : (
                <Users size={20} className="icon-magenta" />
              )}
              <div className="stat-texts">
                <span className="stat-label">RESPUESTAS</span>
                <span className="stat-number">
                  {isHost
                    ? showAnswersCount
                      ? Object.values(statistics).reduce((a, b) => a + b, 0)
                      : "••"
                    : "••"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="top-time-system animate-fade-in">
          <div className="time-display-badge">
            <Timer
              size={20}
              className={
                isPaused && timeLeft > 0 ? "icon-orange" : "icon-magenta"
              }
            />
            <span className="time-text-large">
              {isPaused && timeLeft > 0 ? "Pausa" : `${timeLeft}s`}
            </span>
          </div>
          <div className="time-progress-container">
            <div
              className="time-progress-bar"
              style={{ width: `${answeringProgress}%` }}
            />
          </div>

          {isHost && (
            <div className="host-timer-controls">
              {timeLeft > 0 ? (
                <button className="lr-btn-finish" onClick={handleStopTimer}>
                  Terminar tiempo
                </button>
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
              <div className="question-icon-box">
                <HelpCircle size={24} color="white" />
              </div>
              <h2 className="question-text">{roomData?.text}</h2>
            </div>
            <div className="answering-area animate-fade-in">
              <div className="options-grid">
                {roomData?.options?.map((opt: RoomOption, index: number) => (
                  <button
                    key={opt.id}
                    disabled={isSent || isHost || isPaused || timeLeft === 0}
                    className={`lr-option-item ${selectedOptionId === opt.id ? "active" : ""}`}
                    onClick={() => setSelectedOptionId(opt.id)}
                  >
                    <div className="option-letter-box">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="option-text">{opt.text}</span>
                  </button>
                ))}
              </div>
              {!isHost && (
                <div className="action-bar">
                  <button
                    className={`btn-send-answer ${!selectedOptionId || isPaused || timeLeft === 0 ? "not-selected" : ""} ${isSent ? "is-sent" : ""}`}
                    onClick={handleSubmitAnswer}
                    disabled={
                      !selectedOptionId || isSent || isPaused || timeLeft === 0
                    }
                  >
                    {isSent ? <Check size={18} /> : <Send size={18} />}
                    <span>
                      {isSent ? "Respuesta enviada" : "Enviar respuesta"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AnsweringPhase;
