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
  handleToggleAnswersVisibility: () => void;
  answersCount: number;
  isHost: boolean;
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

const CountdownScreen: React.FC<{ count: number }> = ({ count }) => (
  <div className="live-room-wrapper countdown-bg">
    <div className="countdown-card">
      <h1 className="countdown-number animate-pop">{count}</h1>
      <h2 className="countdown-title">¡Prepárate!</h2>
    </div>
  </div>
);

interface HostTimerControlsProps {
  timeLeft: number;
  handleStopTimer: () => void;
  handleShowResults: () => void;
}

const HostTimerControls: React.FC<HostTimerControlsProps> = ({
  timeLeft,
  handleStopTimer,
  handleShowResults,
}) => (
  <div className="host-timer-controls">
    {timeLeft > 0 ? (
      <button type="button" className="lr-btn-finish" onClick={handleStopTimer}>
        Terminar tiempo
      </button>
    ) : (
      <button
        type="button"
        className="lr-btn-finish"
        onClick={handleShowResults}
      >
        <Eye size={18} /> Ver estadísticas
      </button>
    )}
  </div>
);

interface OptionButtonProps {
  opt: RoomOption;
  index: number;
  disabled: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({
  opt,
  index,
  disabled,
  isSelected,
  onClick,
}) => (
  <button
    type="button"
    disabled={disabled}
    className={`lr-option-item ${isSelected ? "active" : ""}`}
    onClick={onClick}
  >
    <div className="option-letter-box">{String.fromCodePoint(65 + index)}</div>
    <span className="option-text">{opt.text}</span>
  </button>
);

interface StudentActionBarProps {
  selectedOptionId: number | null;
  isPaused: boolean;
  timeLeft: number;
  isSent: boolean;
  handleSubmitAnswer: () => void;
}

const StudentActionBar: React.FC<StudentActionBarProps> = ({
  selectedOptionId,
  isPaused,
  timeLeft,
  isSent,
  handleSubmitAnswer,
}) => {
  const isDisabled = !selectedOptionId || isSent || isPaused || timeLeft === 0;
  const isNotSelected = !selectedOptionId || isPaused || timeLeft === 0;

  return (
    <div className="action-bar">
      <button
        type="button"
        className={`btn-send-answer ${isNotSelected ? "not-selected" : ""} ${isSent ? "is-sent" : ""}`}
        onClick={handleSubmitAnswer}
        disabled={isDisabled}
      >
        {isSent ? <Check size={18} /> : <Send size={18} />}
        <span>{isSent ? "Respuesta enviada" : "Enviar respuesta"}</span>
      </button>
    </div>
  );
};

const AnsweringPhase: React.FC<AnsweringPhaseProps> = ({
  phase,
  count,
  roomCode,
  quizTitle,
  showAnswersCount,
  handleToggleAnswersVisibility,
  answersCount,
  isHost,
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
    return <CountdownScreen count={count} />;
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
            {isHost ? (
              <div className="live-stat-badge">
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={handleToggleAnswersVisibility}
                  title={
                    showAnswersCount
                      ? "Ocultar contador a alumnos"
                      : "Mostrar contador a alumnos"
                  }
                >
                  {showAnswersCount ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
                <div className="stat-texts">
                  <span className="stat-label">RESPUESTAS</span>
                  <span className="stat-number">
                    {showAnswersCount ? answersCount : "••"}
                  </span>
                </div>
              </div>
            ) : showAnswersCount ? (
              <div className="live-stat-badge">
                <Users size={20} className="icon-magenta" />
                <div className="stat-texts">
                  <span className="stat-label">RESPUESTAS</span>
                  <span className="stat-number">{answersCount}</span>
                </div>
              </div>
            ) : null}
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
            <HostTimerControls
              timeLeft={timeLeft}
              handleStopTimer={handleStopTimer}
              handleShowResults={handleShowResults}
            />
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
                  <OptionButton
                    key={opt.id}
                    opt={opt}
                    index={index}
                    disabled={isSent || isHost || isPaused || timeLeft === 0}
                    isSelected={selectedOptionId === opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                  />
                ))}
              </div>
              {!isHost && (
                <StudentActionBar
                  selectedOptionId={selectedOptionId}
                  isPaused={isPaused}
                  timeLeft={timeLeft}
                  isSent={isSent}
                  handleSubmitAnswer={handleSubmitAnswer}
                />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AnsweringPhase;
