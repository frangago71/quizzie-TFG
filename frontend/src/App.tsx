import { useState } from 'react'
import quizzieLogo from './assets/logo-sidebar.png'
import CreateQuiz from './forms/CreateQuiz.tsx'
import ListQuizzes from './forms/ListQuizzes.tsx'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [currentScreen, setCurrentScreen] = useState('inicio');

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
            className={`nav-item ${currentScreen === 'cuestionarios' ? 'active' : ''}`} 
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

      <button
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
      >
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
            <ListQuizzes />
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