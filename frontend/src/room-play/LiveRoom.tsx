import React, { useState, useEffect, useCallback } from "react";
import AnsweringPhase from "./AnsweringPhase";
import ResultsPhase from "./ResultsPhase";
import LeaderboardPhase from "./LeaderboardPhase";
import FinalScreen from "./FinalScreen";
import "./LiveRoom.css";
import api, { WS_BASE_URL } from "../api";
import { useRoom } from "../context/RoomContext.tsx";
import { useParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import type { RoomData } from "../types.ts";

const LiveRoom: React.FC = () => {
  const [phase, setPhase] = useState<"countdown" | "playing">("countdown");
  const [count, setCount] = useState(3);
  const [timeLeft, setTimeLeft] = useState(5);
  const [quizTitle, setQuizTitle] = useState("");
  const [showAnswersCount, setShowAnswersCount] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isSent, setIsSent] = useState(false);

  const [statistics, setStatistics] = useState<Record<string, number>>({});
  const [correctOptionId, setCorrectOptionId] = useState<number | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<
    { name: string; score: number }[]
  >([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const { id: urlRoomId } = useParams();

  const {
    roomId,
    setRoomId,
    roomCode,
    roomData,
    setRoomData,
    participantId,
    userNickname,
  } = useRoom();

  const isHost = !userNickname;
  const { toast } = useToast();

  const room: RoomData | null =
    roomData && !Array.isArray(roomData) ? roomData : null;

  useEffect(() => {
    if (urlRoomId && !roomId) {
      setRoomId(Number(urlRoomId));
    }
  }, [urlRoomId, roomId, setRoomId]);

  const updateRoomStatus = useCallback(
    (data: RoomData) => {
      setRoomData(data);
      if (data.status === "live") {
        const isFirstStart =
          data.current_question_index === 1 &&
          data.time_left !== undefined &&
          data.answer_time !== undefined &&
          data.time_left >= data.answer_time - 1;
        setPhase(isFirstStart ? "countdown" : "playing");
        setCount(isFirstStart ? 3 : 0);
        if (data.statistics) setStatistics(data.statistics);
        if (data.correct_option_id) setCorrectOptionId(data.correct_option_id);
        if (data.leaderboard) setLeaderboardData(data.leaderboard);
        if (data.time_left !== undefined) setTimeLeft(data.time_left);
      } else if (data.status === "verifying" || data.status === "finished") {
        if (data.leaderboard) setLeaderboardData(data.leaderboard);
      }
    },
    [setRoomData],
  );
  const onMessage = useCallback(
    (event: MessageEvent) => {
      const { type, data } = JSON.parse(event.data);
      switch (type) {
        case "next_question":
        case "room_start":
        case "room_update":
          updateRoomStatus(data);
          break;
        case "show_results":
          setStatistics(data.statistics);
          setCorrectOptionId(data.correct_option_id);
          setRoomData((prev) =>
            prev && !Array.isArray(prev) ? { ...prev, phase: "results" } : prev,
          );
          break;
        case "show_leaderboard":
          setLeaderboardData(data.leaderboard);
          setRoomData((prev) =>
            prev && !Array.isArray(prev)
              ? { ...prev, phase: "leaderboard" }
              : prev,
          );
          break;
        case "room_finish":
        case "room_verifying": {
          const status = type === "room_finish" ? "finished" : "verifying";
          setRoomData((prev) =>
            prev && !Array.isArray(prev) ? { ...prev, status } : null,
          );
          break;
        }
        case "participant_verified":
          setRefreshTrigger((prev) => prev + 1);
          break;
        case "timer_update":
          if (data.time_left !== undefined) setTimeLeft(data.time_left);
          if (data.is_paused !== undefined) setIsPaused(data.is_paused);
          break;
        default:
          break;
      }
    },
    [updateRoomStatus, setRoomData],
  );

  useEffect(() => {
    const idToUse = Number(urlRoomId || roomId);
    if (!idToUse || Number.isNaN(idToUse)) return;

    const syncRoom = async () => {
      try {
        const res = await api.get(`/stage/rooms/${idToUse}`);
        updateRoomStatus(res.data);
        if (res.data.time_left !== undefined) setTimeLeft(res.data.time_left);
        if (res.data.is_paused !== undefined) setIsPaused(res.data.is_paused);
      } catch (err) {
        console.error("Error sincronizando:", err);
      }
    };

    syncRoom();
    const ws = new WebSocket(
      `${WS_BASE_URL}/stage/rooms/${idToUse}/ws?role=${isHost ? "teacher" : "student"}`,
    );
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = onMessage;
    return () => ws.close();
  }, [roomId, urlRoomId, isHost, updateRoomStatus, onMessage]);

  useEffect(() => {
    queueMicrotask(() => {
      setIsSent(false);
      setSelectedOptionId(null);
    });
  }, [room?.question_id]);

  const handleShowResults = async () => {
    const vRoomId = Number(roomId || urlRoomId);
    const qId = Number(room?.question_id);
    if (!vRoomId || !qId) return;

    try {
      await api.post(`/stage/rooms/${vRoomId}/questions/${qId}/finish`);
    } catch (error) {
      console.error("Error al finalizar:", error);
      toast.error("Error al finalizar la pregunta.");
    }
  };

  const handleShowLeaderboard = async () => {
    const vRoomId = Number(roomId || urlRoomId);
    if (vRoomId) await api.post(`/stage/rooms/${vRoomId}/leaderboard/show`);
  };

  const handleNextQuestion = async () => {
    const vRoomId = Number(roomId);
    if (vRoomId) await api.patch(`/stage/rooms/${vRoomId}/next-question`);
  };

  const handleStopTimer = async () => {
    const vRoomId = Number(roomId);
    if (vRoomId) await api.post(`/stage/rooms/${vRoomId}/timer/stop`);
  };

  const handleSubmitAnswer = async () => {
    const vParticipantId = Number(participantId);
    const qId = Number(room?.question_id);
    if (!selectedOptionId || isSent || isHost || !vParticipantId || !qId)
      return;

    try {
      await api.post(`/stage/answers`, null, {
        params: {
          participant_id: vParticipantId,
          option_id: selectedOptionId,
          question_id: qId,
        },
      });
      setIsSent(true);
    } catch (error) {
      console.error("Error al enviar:", error);
    }
  };

  useEffect(() => {
    const fetchQuizData = async () => {
      const currentQuizId = Number(room?.quiz_id);
      if (!currentQuizId) return;

      try {
        const response = await api.get(`/content/quizzes/${currentQuizId}/`);
        setQuizTitle(response.data.name || response.data.title || "Sin título");
      } catch (error) {
        console.error(error);
      }
    };
    fetchQuizData();
  }, [room?.quiz_id]);

  useEffect(() => {
    if (phase === "countdown" && count > 0) {
      const t = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(t);
    } else if (phase === "countdown" && count === 0) {
      queueMicrotask(() => {
        setPhase("playing");
        setTimeLeft(room?.answer_time || 45);
      });
    }
  }, [count, phase, room?.answer_time]);

  const totalTime = room?.answer_time || 45;
  const answeringProgress = Math.min(
    100,
    ((totalTime - timeLeft) / totalTime) * 100,
  );

  if (!room)
    return (
      <div className="live-setup-wrapper setup-loading">
        Sincronizando sala...
      </div>
    );

  const renderPhase = () => {
    if (room.status === "verifying" || room.status === "finished") {
      return (
        <FinalScreen
          isHost={isHost}
          data={leaderboardData}
          status={room.status}
          refreshTrigger={refreshTrigger}
        />
      );
    }

    if (room.phase === "results") {
      return (
        <ResultsPhase
          roomData={room}
          statistics={statistics}
          correctOptionId={correctOptionId}
          selectedOptionId={selectedOptionId}
          isHost={isHost}
          handleShowLeaderboard={handleShowLeaderboard}
        />
      );
    }

    if (room.phase === "leaderboard") {
      return (
        <LeaderboardPhase
          data={leaderboardData}
          isHost={isHost}
          handleNextQuestion={handleNextQuestion}
          isLastQuestion={room.current_question_index === room.total_questions}
        />
      );
    }

    return (
      <AnsweringPhase
        phase={phase}
        count={count}
        roomCode={roomCode}
        quizTitle={quizTitle}
        showAnswersCount={showAnswersCount}
        setShowAnswersCount={setShowAnswersCount}
        isHost={isHost}
        statistics={statistics}
        timeLeft={timeLeft}
        answeringProgress={answeringProgress}
        isPaused={isPaused}
        handleShowResults={handleShowResults}
        roomData={room}
        selectedOptionId={selectedOptionId}
        setSelectedOptionId={setSelectedOptionId}
        isSent={isSent}
        handleSubmitAnswer={handleSubmitAnswer}
        handleStopTimer={handleStopTimer}
      />
    );
  };

  return (
    <>
      {!isConnected && (
        <div className="reconnecting-overlay">
          <div className="reconnecting-content">
            <div className="spinner-small"></div>
            <span>Reconectando...</span>
          </div>
        </div>
      )}
      {renderPhase()}
    </>
  );
};

export default LiveRoom;
