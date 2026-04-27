import React, { useState, useEffect } from 'react';
import AnsweringPhase from './AnsweringPhase';
import ResultsPhase from './ResultsPhase';
import LeaderboardPhase from './LeaderboardPhase';
import FinalScreen from './FinalScreen';
import './LiveRoom.css';
import api, { WS_BASE_URL } from '../api';
import { useRoom } from '../context/RoomContext.tsx';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const LiveRoom: React.FC = () => {
    const [phase, setPhase] = useState<'countdown' | 'playing'>('countdown');
    const [count, setCount] = useState(3);
    const [timeLeft, setTimeLeft] = useState(5);
    const [quizTitle, setQuizTitle] = useState('');
    const [showAnswersCount, setShowAnswersCount] = useState(false);
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
    const [isSent, setIsSent] = useState(false);

    const [statistics, setStatistics] = useState<Record<string, number>>({});
    const [correctOptionId, setCorrectOptionId] = useState<number | null>(null);
    const [leaderboardData, setLeaderboardData] = useState<{name: string, score: number}[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isConnected, setIsConnected] = useState(true);
    const [isPaused, setIsPaused] = useState(false);

    const { id: urlRoomId } = useParams();
    const navigate = useNavigate();

    const {
        roomId,
        setRoomId,
        roomCode,
        roomData,
        setRoomData,
        participantId,
        userNickname
    } = useRoom();

    const isHost = !userNickname;
    const { toast } = useToast();

    useEffect(() => {
        if (urlRoomId && !roomId) {
            setRoomId(Number(urlRoomId));
        }
    }, [urlRoomId, roomId, setRoomId]);

    useEffect(() => {
        const idToUse = urlRoomId || roomId;
        if (!idToUse) return;

        const syncRoom = async () => {
            try {
                const res = await api.get(`/stage/rooms/${idToUse}`);
                const data = res.data;
                setRoomData(data);
                setIsPaused(data.is_paused);
                
                if (data.status === 'live') {
                    const isFirstQuestionStart = data.current_question_index === 1 && data.time_left >= (data.answer_time - 1);
                    if (isFirstQuestionStart) {
                        setPhase('countdown');
                        setCount(3);
                    } else {
                        setPhase('playing');
                        setCount(0);
                    }
                    
                    if (data.statistics) setStatistics(data.statistics);
                    if (data.correct_option_id) setCorrectOptionId(data.correct_option_id);
                    if (data.leaderboard) setLeaderboardData(data.leaderboard);

                    setTimeLeft(data.time_left);
                } else if (data.status === 'verifying' || data.status === 'finished') {
                    if (data.leaderboard) setLeaderboardData(data.leaderboard);
                }
            } catch (err) {
                console.error("Error sincronizando al entrar:", err);
            }
        };
        syncRoom();
        
        const ws = new WebSocket(`${WS_BASE_URL}/stage/rooms/${idToUse}/ws?role=${isHost ? 'teacher' : 'student'}`);
        
        ws.onopen = () => {
            console.log("WebSocket conectado");
            setIsConnected(true);
        };

        ws.onclose = () => {
            console.log("WebSocket desconectado");
            setIsConnected(false);
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const data = message.data;

            if (["next_question", "room_start", "room_update"].includes(message.type)) {
                setRoomData(data);
                if (data.status === 'live') {
                    const isFirstQuestionStart = data.current_question_index === 1 && data.time_left >= (data.answer_time - 1);
                    if (isFirstQuestionStart) {
                        setPhase('countdown');
                        setCount(3);
                    } else {
                        setPhase('playing');
                        setCount(0);
                    }
                    
                    if (data.statistics) setStatistics(data.statistics);
                    if (data.correct_option_id) setCorrectOptionId(data.correct_option_id);
                    if (data.leaderboard) setLeaderboardData(data.leaderboard);

                    setTimeLeft(data.time_left);
                } else if (data.status === 'verifying' || data.status === 'finished') {
                    if (data.leaderboard) setLeaderboardData(data.leaderboard);
                }
            }

            if (message.type === "show_results") {
                setStatistics(message.data.statistics);
                setCorrectOptionId(message.data.correct_option_id);
                setRoomData((prev: any) => (prev ? { ...prev, phase: 'results' } : prev));
            }

            if (message.type === "show_leaderboard") {
                setLeaderboardData(message.data.leaderboard);
                setRoomData((prev: any) => (prev ? { ...prev, phase: 'leaderboard' } : prev));
            }

            if (message.type === "room_finish") {
                setRoomData((prev: any) => prev ? { ...prev, status: 'finished' } : null);
            }

            if (message.type === "room_verifying") {
                setRoomData((prev: any) => prev ? { ...prev, status: 'verifying' } : null);
            }

            if (message.type === "participant_verified") {
                setRefreshTrigger(prev => prev + 1);
            }

            if (message.type === "timer_update") {
                setTimeLeft(message.data.time_left);
                setIsPaused(message.data.is_paused);
            }
        };

        return () => ws.close();
    }, [roomId, urlRoomId, setRoomData, navigate]);

    useEffect(() => {
        setIsSent(false);
        setSelectedOptionId(null);
    }, [roomData?.question_id]);

    const handleShowResults = async () => {
        const qId = roomData?.question_id 
        if (!qId) {
            toast.error("No se encuentra el ID de la pregunta");
            return;
        }
        try {
            await api.post(`/stage/rooms/${roomId || urlRoomId}/questions/${qId}/finish`);
        } catch (error) {
            console.error("Error al finalizar: Es posible que el ID enviado sea erróneo", error);
            toast.error("El ID enviado no parece ser de una pregunta válida.");
        }
    };

    const handleShowLeaderboard = async () => {
        try {
            await api.post(`/stage/rooms/${roomId || urlRoomId}/leaderboard/show`);
        } catch (error) {
            console.error("Error al mostrar ranking:", error);
        }
    };

    const handleNextQuestion = async () => {
        try {
            await api.patch(`/stage/rooms/${roomId}/next-question`);
        } catch (error) {
            console.error("Error al pasar de pregunta:", error);
        }
    };

    const handleStopTimer = async () => {
        try {
            await api.post(`/stage/rooms/${roomId}/timer/stop`);
        } catch (error) {
            console.error("Error al detener el tiempo:", error);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!selectedOptionId || isSent || isHost || !participantId || !roomData?.question_id) return;
        try {
            await api.post(`/stage/answers`, null, {
                params: {
                    participant_id: participantId,
                    option_id: selectedOptionId,
                    question_id: roomData.question_id
                }
            });
            setIsSent(true);
        } catch (error) {
            console.error("Error al enviar:", error);
        }
    };

    useEffect(() => {
        const fetchQuizData = async () => {
            const currentQuizId = roomData?.quiz_id;
            if (!currentQuizId) return;

            try {
                const response = await api.get(`/content/quizzes/${currentQuizId}/`);
                setQuizTitle(response.data.name || response.data.title || 'Sin título');
            } catch (error) {
                console.error(error);
            }
        };
        fetchQuizData();
    }, [roomData?.quiz_id]);

    useEffect(() => {
        if (phase === 'countdown' && count > 0) {
            const t = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(t);
        } else if (phase === 'countdown' && count === 0) {
            setPhase('playing');
            setTimeLeft(roomData?.answer_time || 45);
        }
    }, [count, phase]);


    const totalTime = roomData?.answer_time || 45;
    const answeringProgress = Math.min(100, ((totalTime - timeLeft) / totalTime) * 100);

    if (!roomData) return <div className="live-setup-wrapper setup-loading">Sincronizando sala...</div>;

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
            {roomData?.status === 'verifying' || roomData?.status === 'finished' ? (
                <FinalScreen 
                    isHost={isHost} 
                    data={leaderboardData} 
                    status={roomData.status} 
                    refreshTrigger={refreshTrigger} 
                />
            ) : roomData?.phase === 'results' ? (
                <ResultsPhase
                    roomData={roomData}
                    statistics={statistics}
                    correctOptionId={correctOptionId}
                    selectedOptionId={selectedOptionId}
                    isHost={isHost}
                    handleShowLeaderboard={handleShowLeaderboard}
                />
            ) : roomData?.phase === 'leaderboard' ? (
                <LeaderboardPhase
                    data={leaderboardData}
                    isHost={isHost}
                    handleNextQuestion={handleNextQuestion}
                    isLastQuestion={roomData.current_question_index === roomData.total_questions}
                />
            ) : (
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
                    totalTime={totalTime}
                    answeringProgress={answeringProgress}
                    isPaused={isPaused}
                    setTimeLeft={setTimeLeft}
                    handleShowResults={handleShowResults}
                    roomData={roomData}
                    selectedOptionId={selectedOptionId}
                    setSelectedOptionId={setSelectedOptionId}
                    isSent={isSent}
                    handleSubmitAnswer={handleSubmitAnswer}
                    handleStopTimer={handleStopTimer}
                />
            )}
      </>
    );
};

export default LiveRoom;
