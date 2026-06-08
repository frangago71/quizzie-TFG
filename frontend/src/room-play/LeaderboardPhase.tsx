import React from "react";
import { Star, Medal, ArrowRight } from "lucide-react";
import "./LeaderboardPhase.css";

interface Props {
  data: { name: string; score: number }[];
  isHost?: boolean;
  handleNextQuestion?: () => void;
  isLastQuestion?: boolean;
}

const LeaderboardPhase: React.FC<Props> = ({
  data,
  isHost,
  handleNextQuestion,
  isLastQuestion,
}) => {
  const first = data[0] || null;
  const second = data[1] || null;
  const third = data[2] || null;

  const getPodiumTitle = () => {
    if (data.length >= 3) return "Top 3";
    if (data.length === 2) return "Top 2";
    if (data.length === 1) return "Líder";
    return "Clasificación";
  };

  const getPodiumSubtitle = () => {
    if (data.length >= 3) return "¡Enhorabuena a los 3 con mayor puntuación!";
    if (data.length === 2)
      return "¡Enhorabuena a los líderes de la clasificación!";
    if (data.length === 1) return "¡Enhorabuena al líder de la clasificación!";
    return "Esperando puntuaciones...";
  };

  return (
    <div className="live-room-wrapper podium-screen-container animate-fade-in">
      <div className="podium-titles">
        <h1 className="podium-main-title">{getPodiumTitle()}</h1>
        <h2 className="podium-subtitle">{getPodiumSubtitle()}</h2>
      </div>

      {data.length === 0 ? (
        <div
          className="empty-podium-message"
          style={{
            margin: "40px 0",
            textAlign: "center",
            color: "var(--text-gray-light)",
          }}
        >
          <p>No hay participantes en la partida aún.</p>
        </div>
      ) : (
        <div className="podium-wrapper">
          {second && (
            <div
              className="podium-column animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="p-name">{second.name}</span>
              <span className="p-score score-silver">
                {second.score.toLocaleString()} puntos
              </span>
              <div className="p-bar bar-silver">
                <div className="p-medal">
                  <Medal size={24} />
                </div>
              </div>
            </div>
          )}

          {first && (
            <div className="podium-column animate-slide-up">
              <span className="p-name name-gold">{first.name}</span>
              <span className="p-score score-gold">
                {first.score.toLocaleString()} puntos
              </span>
              <div className="p-bar bar-gold">
                <div className="p-medal">
                  <Star size={28} fill="white" stroke="transparent" />
                </div>
              </div>
            </div>
          )}

          {third && (
            <div
              className="podium-column animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              <span className="p-name">{third.name}</span>
              <span className="p-score score-bronze">
                {third.score.toLocaleString()} puntos
              </span>
              <div className="p-bar bar-bronze">
                <div className="p-medal">
                  <Medal size={24} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isHost && handleNextQuestion && (
        <div className="podium-actions">
          <button
            className={`btn-main ${isLastQuestion ? "cyan" : "magenta"}`}
            onClick={handleNextQuestion}
          >
            {isLastQuestion ? "Finalizar cuestionario" : "Siguiente pregunta"}{" "}
            <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPhase;
