import { useState, useEffect } from 'react'
import quizzieLogo from './assets/logo-sidebar.png'
import CreateQuiz from './forms/CreateQuiz.tsx'
import ListQuizzes from './forms/ListQuizzes.tsx'
import SetupRoom from './forms/SetupRoom.tsx'
import RoomCode from './forms/RoomCode.tsx'
import NicknameEntry from './forms/NicknameEntry.tsx'
import Lobby from './forms/Lobby.tsx'
import './App.css'
import LiveRoom from './forms/LiveRoom.tsx'
import axios from 'axios'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [currentScreen, setCurrentScreen] = useState('inicio');

  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);

  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState<number>(0);
  const [userNickname, setUserNickname] = useState<string | undefined>(undefined);
  const [roomData, setRoomData] = useState<any>(null);
  const [participantId, setParticipantId] = useState<number | null>(null);

  const updateRoomData = (newData: any) => {
    setRoomData(newData);
  };

  useEffect(() => {
    let interval: number | undefined;

    if (currentScreen === 'live-room' && roomId) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`http://localhost:8000/content/rooms/${roomId}`);

          if (response.data.current_question_index !== roomData?.current_question_index) {
            setRoomData(response.data);
          }

          if (response.data.status === 'LIVE') {
            setRoomData(response.data); 
            setCurrentScreen('live-room'); 
          }

          if (response.data.status === 'FINISHED') {
            setRoomData(null);
            setCurrentScreen('inicio');
          }
        } catch (error) {
          console.error("Error actualizando datos de sala:", error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScreen, roomId, roomData?.current_question_index]);

  return (
    <div className={`app-container ${sidebarOpen ? 'menu-open' : 'menu-closed'}`}>

      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={quizzieLogo} alt="Quizzie Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <div
            className={`nav-item ${['inicio', 'nickname', 'newnickname'].includes(currentScreen) ? 'active' : ''}`}
            onClick={() => setCurrentScreen('inicio')}
          >
            Inicio
          </div>
          <div
            className={`nav-item ${['cuestionarios', 'setup-room'].includes(currentScreen) ? 'active' : ''}`}
            onClick={() => setCurrentScreen('cuestionarios')}
          >
            Listar cuestionarios
          </div>
          <div className="nav-item">Ajustes</div>
          <div
            className={`nav-item ${currentScreen === 'crear' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('crear')}
          >
            Crear Cuestionario
          </div>
        </nav>
      </aside>

      <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? 'X' : '☰'}
      </button>
      <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}></div>

      <main className="main-content">
        <div className="content-body">

          {currentScreen === 'crear' && (
            <CreateQuiz
              onCancel={() => setCurrentScreen('inicio')}
              onSuccess={() => setCurrentScreen('cuestionarios')}
            />
          )}

          {currentScreen === 'cuestionarios' && (
            <ListQuizzes onStartRoom={(id) => {
              setSelectedQuizId(id);
              setCurrentScreen('setup-room');
            }} />
          )}

          {currentScreen === 'setup-room' && (
            <SetupRoom
              quizId={selectedQuizId}
              onBack={() => setCurrentScreen('cuestionarios')}
              onOpenSession={(code, id) => {
                setRoomCode(code);
                setRoomId(id);
                setCurrentScreen('lobby');
              }}
            />
          )}

          {currentScreen === 'nickname' && (
            <NicknameEntry
              roomCode={roomCode}
              roomId={roomId}
              onNicknameExists={(nickname, participantId) => {
                setUserNickname(nickname);
                setParticipantId(participantId);
                setCurrentScreen('lobby');
              }}
              onBack={() => setCurrentScreen('inicio')}
            />
          )}

          {currentScreen === 'inicio' && (
            <RoomCode onJoinSuccess={(code, id) => {
              setRoomCode(code);
              setRoomId(id);
              setCurrentScreen('nickname');
            }} />
          )}

          {currentScreen === 'lobby' && (
            <Lobby
              roomId={roomId}
              roomCode={roomCode}
              nickname={userNickname}
              handleLiveRoom={(data) => {
                setRoomData(data);
                setCurrentScreen('live-room');
              }}
            />
          )}

          {currentScreen === 'live-room' && (
            <LiveRoom
              isHost={!userNickname}
              participantId={participantId}
              roomCode={roomCode}
              roomId={roomId}
              roomData={roomData}
              quizId={selectedQuizId ?? undefined}
              onUpdateData={updateRoomData}
            />
          )}

        </div>
      </main>
    </div>
  )
}

export default App