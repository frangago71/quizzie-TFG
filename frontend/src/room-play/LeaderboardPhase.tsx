import React from 'react';
import { Star, Medal, ArrowRight } from 'lucide-react';
import './LeaderboardPhase.css';

interface Props {
  data: { name: string; score: number }[];
  isHost?: boolean;
  handleNextQuestion?: () => void;
  isLastQuestion?: boolean;
}

const LeaderboardPhase: React.FC<Props> = ({ data, isHost, handleNextQuestion, isLastQuestion }) => {
  const first = data[0] || null;
  const second = data[1] || null;
  const third = data[2] || null;

  return (
    <div className="live-room-wrapper podium-screen-container animate-fade-in">
      <div className="podium-titles">
        <h1 className="podium-main-title">Top 3</h1>
        <h2 className="podium-subtitle">¡Enhorabuena a los 3 con mayor puntuación!</h2>
      </div>

      <div className="podium-wrapper">
        <div className="podium-column animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {second && (
            <>
              <span className="p-name">{second.name}</span>
              <span className="p-score score-silver">
                {second.score.toLocaleString()} puntos
              </span>
            </>
          )}
          <div className="p-bar bar-silver">
            <div className="p-medal">
              <Medal size={24} />
            </div>
          </div>
        </div>

        <div className="podium-column animate-slide-up">
          {first && (
            <>
              <span className="p-name name-gold">{first.name}</span>
              <span className="p-score score-gold">
                {first.score.toLocaleString()} puntos
              </span>
            </>
          )}
          <div className="p-bar bar-gold">
            <div className="p-medal">
              <Star size={28} fill="white" stroke="transparent" />
            </div>
          </div>
        </div>

        <div className="podium-column animate-slide-up" style={{ animationDelay: '0.4s' }}>
          {third && (
            <>
              <span className="p-name">{third.name}</span>
              <span className="p-score score-bronze">
                {third.score.toLocaleString()} puntos
              </span>
            </>
          )}
          <div className="p-bar bar-bronze">
            <div className="p-medal">
              <Medal size={24} />
            </div>
          </div>
        </div>
      </div>

      {isHost && handleNextQuestion && (
        <div className="podium-actions">
          <button className={`btn-main ${isLastQuestion ? 'cyan' : 'magenta'}`} onClick={handleNextQuestion}>
            {isLastQuestion ? 'Finalizar cuestionario' : 'Siguiente pregunta'} <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPhase;