import { useState } from 'react'
import quizzieLogo from './assets/logo-sidebar.png'
import CreateQuiz from './forms/CreateQuiz.tsx'
import ListQuizzes from './forms/ListQuizzes.tsx'
import SetupRoom from './forms/SetupRoom.tsx' 
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [currentScreen, setCurrentScreen] = useState('inicio');
  
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);

  return (
    <div className={`app-container ${sidebarOpen ? 'menu-open' : 'menu-closed'}`}>

      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={quizzieLogo} alt="Quizzie Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${currentScreen === 'inicio' ? 'active' : ''}`} 
            onClick={() => setCurrentScreen('inicio')}
          >
            Inicio
          </div>
          
          <div 
            className={`nav-item ${currentScreen === 'cuestionarios' || currentScreen === 'setup-room' ? 'active' : ''}`} 
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
          
          {currentScreen === 'crear' ? (
            <CreateQuiz 
              onCancel={() => setCurrentScreen('inicio')}
              onSuccess={() => setCurrentScreen('cuestionarios')} />
          ) : currentScreen === 'cuestionarios' ? (
            <ListQuizzes onStartRoom={(id) => {
              setSelectedQuizId(id);
              setCurrentScreen('setup-room');
            }} />
          ) : currentScreen === 'setup-room' ? (
            <SetupRoom 
              quizId={selectedQuizId} 
              onBack={() => setCurrentScreen('cuestionarios')}
              onOpenSession={(code) => console.log("PIN generado:", code)} 
            />
          ) : (
            <>
              <h1>¡Bienvenido a Quizzie!</h1>
              <p>¿Estás preparado para poner a prueba tus conocimientos?</p>
            </>
          )}

        </div>
      </main>
    </div>
  )
}

export default App