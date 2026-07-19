import React, { useState, useEffect } from "react";
import { ArrowLeft, Users, Trophy, X, ChevronRight } from "lucide-react";
import api from "../api";
import "../auth/Modal.css";
import "./RoomHistoryModal.css";

export interface PastRoom {
  id: number;
  join_code: string;
  date: string;
  participants_count: number;
}

export interface StudentResult {
  name: string;
  score: number;
  correct_answers: number;
  total_questions: number;
}

interface RoomHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: number;
  quizTitle: string;
}

const RoomHistoryModal: React.FC<RoomHistoryModalProps> = ({
  isOpen,
  onClose,
  quizId,
  quizTitle,
}) => {
  const [view, setView] = useState<"history" | "results">("history");
  const [history, setHistory] = useState<PastRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<PastRoom | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quizId]);

  const fetchHistory = async () => {
    setView("history");
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<PastRoom[]>(
        `/stage/quizzes/${quizId}/history`,
      );
      setHistory(response.data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar el historial de salas.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (room: PastRoom) => {
    setSelectedRoom(room);
    setView("results");
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<StudentResult[]>(
        `/stage/rooms/${room.id}/results`,
      );
      setResults(response.data);
    } catch (err) {
      console.error(err);
      setError("Error al cargar los resultados de la sala.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
      role="button"
      tabIndex={-1}
    >
      <div className="modal-card modal-history-card">
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        {view === "history" ? (
          <>
            <div className="modal-header modal-header-left">
              <h2>Historial de salas</h2>
              <p className="modal-header-subtitle">{quizTitle}</p>
            </div>

            <div className="modal-history-content">
              {loading ? (
                <div className="modal-history-loading">
                  Cargando historial...
                </div>
              ) : error ? (
                <div className="modal-history-error">{error}</div>
              ) : history.length === 0 ? (
                <div className="modal-history-empty">
                  No hay salas finalizadas con este cuestionario.
                </div>
              ) : (
                <div className="history-list">
                  {history.map((room) => (
                    <div key={room.id} className="history-item">
                      <div className="history-item-info">
                        <span className="history-item-date">
                          {formatDate(room.date)}
                        </span>
                        <div className="history-item-participants">
                          <Users size={14} />
                          <span>
                            {room.participants_count}{" "}
                            {room.participants_count === 1
                              ? "alumno"
                              : "alumnos"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-main small cyan history-item-btn"
                        onClick={() => handleViewResults(room)}
                      >
                        Ver resultados
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions modal-actions-history">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header modal-header-results">
              <button
                type="button"
                className="btn-back-history"
                onClick={() => setView("history")}
                aria-label="Volver al historial"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h2>Clasificación final</h2>
                <p>{selectedRoom && formatDate(selectedRoom.date)}</p>
              </div>
            </div>

            <div className="modal-history-content results-view">
              {loading ? (
                <div className="modal-history-loading">
                  Cargando resultados...
                </div>
              ) : error ? (
                <div className="modal-history-error">{error}</div>
              ) : results.length === 0 ? (
                <div className="modal-history-empty">
                  No se registraron alumnos verificados en esta sesión.
                </div>
              ) : (
                <div className="results-list">
                  {results.map((student, index) => {
                    const isPodium = index < 3;
                    const podiumColors = ["#e2b808", "#94a3b8", "#b45309"];
                    return (
                      <div
                        key={student.name}
                        className="result-item"
                        style={{
                          border: isPodium
                            ? `1.5px solid ${podiumColors[index]}`
                            : "1px solid var(--border-input)",
                          background:
                            index === 0
                              ? "rgba(226, 184, 8, 0.05)"
                              : "var(--color-white)",
                        }}
                      >
                        <div className="result-student-info">
                          <span
                            className="result-student-rank"
                            style={{
                              background: isPodium
                                ? podiumColors[index]
                                : "var(--border-input)",
                              color: isPodium ? "white" : "var(--text-dark)",
                            }}
                          >
                            {index + 1}
                          </span>
                          <span className="result-student-name">
                            {student.name}
                          </span>
                        </div>
                        <div className="result-score-container">
                          {index === 0 && <Trophy size={16} color="#e2b808" />}
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-gray-light)",
                              marginRight: "8px",
                            }}
                          >
                            {student.correct_answers}/{student.total_questions}
                          </span>
                          <span className="result-score-text">
                            {student.score} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomHistoryModal;
