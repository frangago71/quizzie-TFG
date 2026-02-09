import { useState } from 'react'
import quizzieLogo from './assets/logo-sidebar.png' 
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className={`app-container ${sidebarOpen ? 'menu-open' : 'menu-closed'}`}>
      
      <aside className="sidebar">
        <div className="sidebar-header">
           <img src={quizzieLogo} alt="Quizzie Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active">Inicio</div>
          <div className="nav-item">Cuestionarios</div>
          <div className="nav-item">Ajustes</div>
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
          <h1>¡Bienvenido a Quizzie!</h1>
          <p>
            ¿Estás preparado para poner a prueba tus conocimientos?
          </p>
        </div>
      </main>
    </div>
  )
}

export default App