import React from "react";
import type { RoomData, RoomOption } from "../types.ts";

import {
  Users,
  Check,
  XCircle,
  MinusCircle,
  Target,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from "lucide-react";
import "./ResultsPhase.css";

interface ResultsPhaseProps {
  roomData: RoomData;
  statistics: Record<string, number>;
  correctOptionId: number | null;
  selectedOptionId: number | null;
  isHost: boolean;
  handleShowLeaderboard: () => void;
}

interface ResultsChartProps {
  options: RoomOption[];
  statistics: Record<string, number>;
  correctOptionId: number | null;
  selectedOptionId: number | null;
}

const ResultsChart: React.FC<ResultsChartProps> = ({
  options,
  statistics,
  correctOptionId,
  selectedOptionId,
}) => {
  const maxVotes = Math.max(...Object.values(statistics), 0);

  return (
    <div className="chart-area">
      {options?.map((opt: RoomOption, index: number) => {
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
              <span className="bar-count" style={{ color: barColor }}>
                {votes}
              </span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>
            <div className="bar-info">
              <span className="bar-option-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="bar-option-text">{opt.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface SummaryCardProps {
  isHost: boolean;
  totalVotes: number;
  isTie: boolean;
  isConsensusCorrect: boolean;
  userIsCorrect: boolean;
  selectedOptionId: number | null;
  winningOptionId: string | null;
  winningOptionLetter: string;
  globalSuccess: number;
}

const SummaryCards: React.FC<SummaryCardProps> = ({
  isHost,
  totalVotes,
  isTie,
  isConsensusCorrect,
  userIsCorrect,
  selectedOptionId,
  winningOptionLetter,
  globalSuccess,
}) => {
  const getStatusData = () => {
    if (isHost) {
      if (isTie) {
        return {
          bg: "bg-gray-soft",
          icon: <MinusCircle size={22} color="#94a3b8" />,
          value: "---",
        };
      }
      return {
        bg: isConsensusCorrect ? "bg-green-soft" : "bg-red-soft",
        icon: isConsensusCorrect ? (
          <TrendingUp size={22} color="var(--color-green)" />
        ) : (
          <TrendingDown size={22} color="var(--color-red)" />
        ),
        value: `Opción ${winningOptionLetter}`,
      };
    }

    if (!selectedOptionId) {
      return {
        bg: "bg-gray-soft",
        icon: <MinusCircle size={22} color="#94a3b8" />,
        value: "Sin voto",
      };
    }

    return {
      bg: userIsCorrect ? "bg-green-soft" : "bg-red-soft",
      icon: userIsCorrect ? (
        <Check size={22} color="var(--color-green)" />
      ) : (
        <XCircle size={22} color="var(--color-red)" />
      ),
      value: userIsCorrect ? "¡Correcto!" : "Fallaste",
    };
  };

  const status = getStatusData();

  return (
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
        <div className={`summary-icon-box ${status.bg}`}>{status.icon}</div>
        <div className="summary-data">
          <span className="summary-label">
            {isHost ? "OPCIÓN MÁS VOTADA" : "TU RESULTADO"}
          </span>
          <span className="summary-value">{status.value}</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon-box bg-purple-soft">
          <Target size={22} color="var(--color-purple)" />
        </div>
        <div className="summary-data">
          <span className="summary-label">ÉXITO GLOBAL</span>
          <span className="summary-value">{globalSuccess}%</span>
        </div>
      </div>
    </div>
  );
};

const ResultsPhase: React.FC<ResultsPhaseProps> = ({
  roomData,
  statistics,
  correctOptionId,
  selectedOptionId,
  isHost,
  handleShowLeaderboard,
}) => {
  const totalVotes = Object.values(statistics).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...Object.values(statistics), 0);
  const winners = Object.keys(statistics).filter(
    (id) => statistics[id] === maxVotes,
  );
  const isTie = winners.length > 1 || totalVotes === 0;
  const winningOptionId = winners.length === 1 ? winners[0] : null;
  const isConsensusCorrect =
    !isTie && winningOptionId === correctOptionId?.toString();
  const userIsCorrect = selectedOptionId === correctOptionId;

  const winningOptionIndex =
    roomData.options?.findIndex(
      (o: RoomOption) => o.id.toString() === winningOptionId,
    ) ?? -1;
  const winningOptionLetter =
    winningOptionIndex !== -1
      ? String.fromCharCode(65 + winningOptionIndex)
      : "---";

  const globalSuccess =
    totalVotes > 0
      ? Math.round(
          ((statistics[correctOptionId?.toString() || ""] || 0) / totalVotes) *
            100,
        )
      : 0;

  return (
    <div className="live-room-wrapper results-mode">
      <div className="results-container animate-fade-in">
        <h1 className="results-title">{roomData.text}</h1>
        <div className="chart-main-container">
          <ResultsChart
            options={roomData.options || []}
            statistics={statistics}
            correctOptionId={correctOptionId}
            selectedOptionId={selectedOptionId}
          />
        </div>

        <SummaryCards
          isHost={isHost}
          totalVotes={totalVotes}
          isTie={isTie}
          isConsensusCorrect={isConsensusCorrect}
          userIsCorrect={userIsCorrect}
          selectedOptionId={selectedOptionId}
          winningOptionId={winningOptionId}
          winningOptionLetter={winningOptionLetter}
          globalSuccess={globalSuccess}
        />

        {isHost && (
          <div className="results-actions">
            <button
              className="btn-continue-host"
              onClick={handleShowLeaderboard}
            >
              Ver Ranking <ChevronRight size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPhase;
