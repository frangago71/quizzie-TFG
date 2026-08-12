import api from "../api.ts";
import type { Quiz } from "../types.ts";
import "./ListQuizzes.css";
import React, { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Eye, Play, Plus, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DeleteQuizModal, { type Room } from "./DeleteQuizModal.tsx";
import RoomHistory from "./RoomHistory.tsx";

import { useRoom } from "../context/RoomContext.tsx";
import { useToast } from "../context/ToastContext.tsx";

type FilterTab = "todos" | "nuevos" | "inactivos";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
};

const TagList: React.FC<{ tags?: string }> = ({ tags }) => {
  if (!tags) return null;
  const allTags = tags.split(",");
  const total = allTags.length;
  return (
    <div className="tags-container">
      {total <= 3 ? (
        allTags.map((tag) => {
          const trimmed = tag.trim();
          return (
            <span key={trimmed} className="category-tag">
              {trimmed}
            </span>
          );
        })
      ) : (
        <>
          {allTags.slice(0, 2).map((tag) => {
            const trimmed = tag.trim();
            return (
              <span key={trimmed} className="category-tag">
                {trimmed}
              </span>
            );
          })}
          <span className="category-tag">+{total - 2}</span>
        </>
      )}
    </div>
  );
};

interface QuizCardProps {
  quiz: Quiz;
  isMobile: boolean;
  hasActiveRoom: boolean;
  onNavigate: (path: string) => void;
  onSetRoomId: (id: number | null) => void;
  onPrepareDelete: (quiz: Quiz) => void;
  onForceFinish: (roomId: number | null) => void;
  onViewHistory: (quiz: Quiz) => void;
}

interface QuizActionButtonsProps {
  quiz: Quiz;
  onNavigate: (path: string) => void;
  onPrepareDelete: (quiz: Quiz) => void;
  onViewHistory: (quiz: Quiz) => void;
}

const QuizActionButtons: React.FC<QuizActionButtonsProps> = ({
  quiz,
  onNavigate,
  onPrepareDelete,
  onViewHistory,
}) => (
  <div className="action-icons">
    <button
      type="button"
      className="icon-btn"
      title="Editar"
      onClick={() => onNavigate(`/quizzes/edit/${quiz.id}`)}
    >
      <Pencil size={18} />
    </button>
    <button
      type="button"
      className="icon-btn"
      title="Eliminar"
      onClick={() => onPrepareDelete(quiz)}
    >
      <Trash2 size={18} />
    </button>
    <button
      type="button"
      className="icon-btn"
      title="Ver"
      onClick={() => onViewHistory(quiz)}
    >
      <Eye size={18} />
    </button>
  </div>
);

interface QuizRoomControlsProps {
  quiz: Quiz;
  isSmall?: boolean;
  hasActiveRoom: boolean;
  onReconnect: () => void;
  onCreateRoom: () => void;
  onForceFinish: (roomId: number | null) => void;
}

const QuizRoomControls: React.FC<QuizRoomControlsProps> = ({
  quiz,
  isSmall,
  hasActiveRoom,
  onReconnect,
  onCreateRoom,
  onForceFinish,
}) => {
  const btnClass = `btn-main${isSmall ? " small" : ""}`;

  if (quiz.active_room_status) {
    return (
      <div className="btn-group">
        <button
          type="button"
          className={`${btnClass} cyan`}
          onClick={onReconnect}
        >
          Reconectar
        </button>
        <button
          type="button"
          className={`${btnClass} danger`}
          onClick={() => onForceFinish(quiz.active_room_id ?? null)}
        >
          Finalizar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${btnClass} ${isSmall ? "" : "big"} magenta`}
      disabled={hasActiveRoom}
      title={hasActiveRoom ? "Ya tienes una sala activa" : ""}
      onClick={onCreateRoom}
    >
      <Play size={16} fill="white" />
      Crear sala
    </button>
  );
};

const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  isMobile,
  hasActiveRoom,
  onNavigate,
  onSetRoomId,
  onPrepareDelete,
  onForceFinish,
  onViewHistory,
}) => {
  const parseDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES");
  };

  const handleReconnect = () => {
    onSetRoomId(quiz.active_room_id || null);
    const status = quiz.active_room_status?.toLowerCase();
    const destination =
      status === "waiting"
        ? `/lobby/${quiz.active_room_id}`
        : `/live/${quiz.active_room_id}`;
    onNavigate(destination);
  };

  const handleCreateRoom = () => {
    onSetRoomId(quiz.id);
    onNavigate(`/quizzes/setup/${quiz.id}`);
  };

  const getStatusLabel = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === "waiting") return "En Lobby";
    if (lower === "live") return "En vivo";
    if (lower === "verifying") return "Verificando";
    return status;
  };

  return (
    <div className="quiz-horizontal-card">
      <div className="quiz-image-container">
        <img
          src={`https://picsum.photos/seed/quiz-${quiz.id}/400/300`}
          alt={quiz.title}
          className="quiz-card-img"
        />
        <TagList tags={quiz.tags} />
      </div>
      <div className="quiz-info-content">
        {isMobile ? (
          <>
            <div className="info-main-text">
              <h3>{quiz.title}</h3>
              <p className="quiz-description">{quiz.description}</p>
            </div>
            <div className="info-footer-row">
              <div className="meta-date">
                <Calendar size={14} color="#94a3b8" />
                <span>{parseDate(quiz.created_at ?? "")}</span>
              </div>
              <QuizRoomControls
                quiz={quiz}
                isSmall
                hasActiveRoom={hasActiveRoom}
                onReconnect={handleReconnect}
                onCreateRoom={handleCreateRoom}
                onForceFinish={onForceFinish}
              />
            </div>
            <QuizActionButtons
              quiz={quiz}
              onNavigate={onNavigate}
              onPrepareDelete={onPrepareDelete}
              onViewHistory={onViewHistory}
            />
          </>
        ) : (
          <>
            <div className="info-top">
              <div className="title-with-status">
                <h3>{quiz.title}</h3>
                {quiz.active_room_status && (
                  <span
                    className={`status-badge ${quiz.active_room_status.toLowerCase()}`}
                  >
                    {getStatusLabel(quiz.active_room_status)}
                  </span>
                )}
              </div>
              <QuizActionButtons
                quiz={quiz}
                onNavigate={onNavigate}
                onPrepareDelete={onPrepareDelete}
                onViewHistory={onViewHistory}
              />
            </div>
            <p className="quiz-description">{quiz.description}</p>
            <div className="info-bottom">
              <div className="meta-data">
                <div className="meta-item">
                  <Calendar size={14} color="#94a3b8" />
                  <span>{parseDate(quiz.created_at ?? "")}</span>
                </div>
              </div>
              <QuizRoomControls
                quiz={quiz}
                hasActiveRoom={hasActiveRoom}
                onReconnect={handleReconnect}
                onCreateRoom={handleCreateRoom}
                onForceFinish={onForceFinish}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ListQuizzes: React.FC = () => {
  const [teacherQuizzes, setTeacherQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [quizRooms, setQuizRooms] = useState<Room[]>([]);
  const [historyQuiz, setHistoryQuiz] = useState<Quiz | null>(null);

  const [activeTab, setActiveTab] = useState<FilterTab>("todos");
  const navigate = useNavigate();
  const { setRoomId } = useRoom();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const hasActiveRoom = teacherQuizzes.some(
    (q) => q.active_room_status != null,
  );

  const NEW_DAYS_THRESHOLD = 7;

  const filteredQuizzes = teacherQuizzes.filter((quiz) => {
    if (activeTab === "todos") return true;
    if (activeTab === "inactivos") return quiz.active_room_status == null;
    if (activeTab === "nuevos") {
      if (!quiz.created_at) return false;
      const created = new Date(quiz.created_at);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= NEW_DAYS_THRESHOLD;
    }
    return true;
  });

  const fetchQuizzes = useCallback(async () => {
    try {
      const response = await api.get(`/users/my-quizzes`);
      setTeacherQuizzes(response.data);
    } catch (error) {
      console.error("Error cargando los quizzes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const handlePrepareDelete = async (quiz: Quiz) => {
    try {
      const response = await api.get(`/content/quizzes/${quiz.id}/rooms`);
      setQuizRooms(response.data);
      setQuizToDelete(quiz);
    } catch (error) {
      console.error("Error al obtener las salas del cuestionario:", error);
      setQuizRooms([]);
      setQuizToDelete(quiz);
    }
  };

  const handleForceFinish = async (roomId: number | null) => {
    if (!roomId) return;
    if (
      !confirm(
        "¿Seguro que quieres finalizar esta sala? Los alumnos serán desconectados.",
      )
    )
      return;
    try {
      await api.post(`/stage/rooms/${roomId}/force-finish`);
      await fetchQuizzes();
      toast.success("Sala finalizada correctamente.");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Error al finalizar la sala");
    }
  };

  const handleDeleteConfirm = async (hard: boolean) => {
    if (!quizToDelete) return;
    try {
      const endpoint = hard
        ? `/content/quizzes/${quizToDelete.id}/hard`
        : `/content/quizzes/${quizToDelete.id}`;
      await api.delete(endpoint);
      setTeacherQuizzes(teacherQuizzes.filter((q) => q.id !== quizToDelete.id));
      toast.success("Cuestionario eliminado correctamente.");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      console.error("Error al borrar el cuestionario:", err);
      toast.error(
        err.response?.data?.detail || "Error al borrar el cuestionario",
      );
    } finally {
      setQuizToDelete(null);
      setQuizRooms([]);
    }
  };

  if (loading) {
    return <div className="loading-state">Cargando cuestionarios...</div>;
  }

  return (
    <div className="list-quizzes-page">
      <header className="list-header">
        <div className="header-titles">
          <h1>Mis Cuestionarios</h1>
          <p>Gestiona y lanza tus sesiones en tiempo real.</p>
        </div>
        <div className="filter-tabs">
          <button
            type="button"
            className={`tab${activeTab === "todos" ? " active" : ""}`}
            onClick={() => setActiveTab("todos")}
          >
            Todos
          </button>
          <button
            type="button"
            className={`tab${activeTab === "nuevos" ? " active" : ""}`}
            onClick={() => setActiveTab("nuevos")}
          >
            Nuevos
          </button>
          <button
            type="button"
            className={`tab${activeTab === "inactivos" ? " active" : ""}`}
            onClick={() => setActiveTab("inactivos")}
          >
            Inactivos
          </button>
        </div>
      </header>

      <div className="quizzes-list-container">
        {filteredQuizzes.length === 0 && (
          <div className="empty-filter-state">
            <span className="empty-filter-icon">🔍</span>
            <h3>
              {activeTab === "nuevos"
                ? "No hay cuestionarios nuevos"
                : activeTab === "inactivos"
                  ? "No hay cuestionarios inactivos"
                  : "No tienes cuestionarios creados"}
            </h3>
            <p>
              {activeTab === "nuevos"
                ? `No has creado ningún cuestionario en los últimos ${NEW_DAYS_THRESHOLD} días.`
                : activeTab === "inactivos"
                  ? "No hay cuestionarios inactivos en este momento."
                  : "Crea tu primer cuestionario."}
            </p>
          </div>
        )}
        {filteredQuizzes.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            isMobile={isMobile}
            hasActiveRoom={hasActiveRoom}
            onNavigate={navigate}
            onSetRoomId={setRoomId}
            onPrepareDelete={handlePrepareDelete}
            onForceFinish={handleForceFinish}
            onViewHistory={(q) => setHistoryQuiz(q)}
          />
        ))}

        <button
          type="button"
          className="create-new-dashed"
          onClick={() => navigate("/quizzes/create")}
        >
          <div className="dashed-content">
            <div className="plus-icon-container">
              <Plus size={28} color="#64748b" />
            </div>
            <h3>Crear un nuevo cuestionario</h3>
            <p>Diseña un set de preguntas personalizado para tus alumnos.</p>
          </div>
        </button>
      </div>

      <DeleteQuizModal
        isOpen={!!quizToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setQuizToDelete(null);
          setQuizRooms([]);
        }}
        rooms={quizRooms}
      />

      <RoomHistory
        isOpen={!!historyQuiz}
        onClose={() => setHistoryQuiz(null)}
        quizId={historyQuiz?.id ?? 0}
        quizTitle={historyQuiz?.title ?? ""}
      />
    </div>
  );
};

export default ListQuizzes;
