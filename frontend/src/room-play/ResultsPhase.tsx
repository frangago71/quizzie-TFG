import React from 'react';
import { Users, Check, XCircle, MinusCircle, Target, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import './ResultsPhase.css';

interface ResultsPhaseProps {
    roomData: any;
    statistics: Record<string, number>;
    correctOptionId: number | null;
    selectedOptionId: number | null;
    isHost: boolean;
    handleShowLeaderboard: () => void;
}

const ResultsPhase: React.FC<ResultsPhaseProps> = ({
    roomData,
    statistics,
    correctOptionId,
    selectedOptionId,
    isHost,
    handleShowLeaderboard
}) => {
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
                        {roomData.options?.map((opt: any, index: number) => {
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
                                        <span className="bar-option-letter">{String.fromCharCode(65 + index)}</span>
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
                                    ? (isTie ? "---" : `Opción ${String.fromCharCode(65 + roomData.options?.findIndex((o: any) => o.id.toString() === winningOptionId))}`)
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
                        <button className="btn-continue-host" onClick={handleShowLeaderboard}>
                            Ver Ranking <ChevronRight size={22} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultsPhase;
