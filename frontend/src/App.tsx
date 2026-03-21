import { useState } from 'react'
import quizzieLogo from './assets/logo-sidebar.png'
import CreateQuiz from './forms/CreateQuiz.tsx'
import ListQuizzes from './forms/ListQuizzes.tsx'
import SetupRoom from './forms/SetupRoom.tsx'
import RoomCode from './forms/RoomCode.tsx'
import NicknameEntry from './forms/NicknameEntry.tsx'
import Lobby from './forms/Lobby.tsx'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [currentScreen, setCurrentScreen] = useState('inicio');

  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);

  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState<number>(0);
  const [userNickname, setUserNickname] = useState<string | undefined>(undefined);

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
              onNicknameExists={(nickname) => {
                setUserNickname(nickname);
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
              handleLiveRoom={() => {
                setCurrentScreen('live-room'); 
              }}
            />
          )}

          {currentScreen === 'live-room' && (
            // <QuizSession
            //   isHost={!userNickname}
            //   roomId={roomId}
            //   initialData={gameData} 
            // />
            <h3>Sala activa</h3>
          )}

        </div>
      </main>
    </div>
  )
}

export default App