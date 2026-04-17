import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './layouts/Sidebar.tsx';
import { RoomProvider } from './context/RoomContext.tsx';

import CreateQuiz from './management/CreateQuiz.tsx';
import ListQuizzes from './management/ListQuizzes.tsx';
import SetupRoom from './management/SetupRoom.tsx';
import RoomCode from './room-access/RoomCode.tsx';
import NicknameEntry from './room-access/NicknameEntry.tsx';
import Lobby from './room-play/Lobby.tsx';
import LiveRoom from './room-play/LiveRoom.tsx';

import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <RoomProvider>
      <div className={`app-container ${sidebarOpen ? 'menu-open' : 'menu-closed'}`}>
        
        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

        <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? 'X' : '☰'}
        </button>
        
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}></div>

        <main className="main-content">
          <div className="content-body">
            <Routes>
              <Route path="/" element={<RoomCode />} />
              
              <Route path="/join/:code" element={<NicknameEntry />} />

              <Route path="/quizzes" element={<ListQuizzes />} />
              <Route path="/quizzes/create" element={<CreateQuiz />} />
              <Route path="/quizzes/setup/:id" element={<SetupRoom />} />

              <Route path="/lobby/:roomId" element={<Lobby />} />
              <Route path="/live/:roomId" element={<LiveRoom />} />

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </RoomProvider>
  );
}

export default App;