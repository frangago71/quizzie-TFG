import React, { useState, useEffect } from 'react';
import AnsweringPhase from './AnsweringPhase';
import ResultsPhase from './ResultsPhase';
import LeaderboardPhase from './LeaderboardPhase';
import './LiveRoom.css';
import api, { WS_BASE_URL } from '../api';
import { useRoom } from '../context/RoomContext.tsx';
import { useParams, useNavigate } from 'react-router-dom';

const LiveRoom: React.FC = () => {
    const [phase, setPhase] = useState<'countdown' | 'playing'>('countdown');
    const [step, setStep] = useState<'reading' | 'answering'>('reading');
    const [count, setCount] = useState(3);
    const [timeLeft, setTimeLeft] = useState(5);
    const [quizTitle, setQuizTitle] = useState('');
    const [showAnswersCount, setShowAnswersCount] = useState(false);
    const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
    const [isSent, setIsSent] = useState(false);

    const [showResults, setShowResults] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<{name: string, score: number}[]>([]);
    const [statistics, setStatistics] = useState<Record<string, number>>({});
    const [correctOptionId, setCorrectOptionId] = useState<number | null>(null);

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
                setRoomData(res.data);
            } catch (err) {
                console.error("Error sincronizando al entrar:", err);
            }
        };
        syncRoom();

        const ws = new WebSocket(`${WS_BASE_URL}/stage/rooms/${idToUse}/ws`);

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (["next_question", "room_start", "room_update"].includes(message.type)) {
                setRoomData(message.data);
                setShowResults(false);
                setShowLeaderboard(false);
                setCorrectOptionId(null);
                setPhase('playing');
                setStep('reading');
                setCount(0); 
                setTimeLeft(5);
            }

            if (message.type === "show_results") {
                setStatistics(message.data.statistics);
                setCorrectOptionId(message.data.correct_option_id);
                setShowResults(true);
                setShowLeaderboard(false);
            }

            if (message.type === "show_leaderboard") {
                setShowResults(false);
                setShowLeaderboard(true);
                api.get(`/stage/rooms/${idToUse}/leaderboard`).then(res => {
                    setLeaderboardData(res.data);
                }).catch(err => console.error(err));
            }

            if (message.type === "room_finish") {
                alert("¡Cuestionario finalizado!");
                if (isHost) { navigate('/dashboard');
                    navigate('/dashboard');
                } else {
                    navigate('/');
                }
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
            alert("No se encuentra el ID de la pregunta");
            return;
        }
        try {
            await api.post(`/stage/rooms/${roomId}/questions/${qId}/finish`);
        } catch (error) {
            console.error("Error al finalizar: Es posible que el ID enviado sea erróneo", error);
            alert("El ID enviado no parece ser de una pregunta válida.");
        }
    };

    const handleShowLeaderboard = async () => {
        try {
            await api.post(`/stage/rooms/${roomId}/leaderboard/show`);
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
            setTimeLeft(5);
        }
    }, [count, phase]);

    useEffect(() => {
        if (phase === 'playing' && timeLeft >= 0) {
            const timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    setTimeLeft(prev => prev - 1);
                } else if (timeLeft === 0 && step === 'reading') {
                    setStep('answering');
                    setTimeLeft(40);
                }
            }, 1000);
            return () => clearInterval(timerInterval);
        }
    }, [phase, timeLeft, step]);

    const readingProgress = Math.min(100, ((5 - timeLeft) / 5) * 100);
    const answeringProgress = Math.min(100, ((40 - timeLeft) / 40) * 100);

    if (!roomData) return <div className="setup-wrapper setup-loading">Sincronizando sala...</div>;

    if (showLeaderboard) {
        return (
            <LeaderboardPhase
                data={leaderboardData}
                isHost={isHost}
                handleNextQuestion={handleNextQuestion}
            />
        );
    }

    if (showResults) {
        return (
            <ResultsPhase
                roomData={roomData}
                statistics={statistics}
                correctOptionId={correctOptionId}
                selectedOptionId={selectedOptionId}
                isHost={isHost}
                handleShowLeaderboard={handleShowLeaderboard}
            />
        );
    }

    return (
        <AnsweringPhase
            phase={phase}
            step={step}
            count={count}
            roomCode={roomCode}
            quizTitle={quizTitle}
            showAnswersCount={showAnswersCount}
            setShowAnswersCount={setShowAnswersCount}
            isHost={isHost}
            statistics={statistics}
            timeLeft={timeLeft}
            readingProgress={readingProgress}
            answeringProgress={answeringProgress}
            setTimeLeft={setTimeLeft}
            handleShowResults={handleShowResults}
            roomData={roomData}
            selectedOptionId={selectedOptionId}
            setSelectedOptionId={setSelectedOptionId}
            isSent={isSent}
            handleSubmitAnswer={handleSubmitAnswer}
        />
    );
};

export default LiveRoom;
