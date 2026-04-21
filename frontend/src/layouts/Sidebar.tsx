import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import quizzieLogo from '../assets/logo-sidebar.png';
import { Menu, ChevronLeft } from 'lucide-react'; 
import { authService } from '../auth/authService';
import LogoutModal from '../auth/LogoutModal';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

function Sidebar({ isOpen, toggle }: SidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      toggle();
    }
  };

  const handleLogout = () => {
    authService.logout();
    localStorage.clear(); 
    window.location.href = '/';
  };

  return (
    <>
      <button className="sidebar-toggle-btn" onClick={toggle}>
        {isOpen ? <ChevronLeft size={18} /> : <Menu size={20} />}
      </button>

      <div className={isOpen ? 'menu-open' : ''}>
        <aside className="sidebar">
          <div className="sidebar-header">
            <img src={quizzieLogo} alt="Quizzie Logo" className="sidebar-logo" />
          </div>

          <nav className="sidebar-nav">
            <div className="nav-menu-top">
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                Inicio
              </NavLink>

              <NavLink
                to="/quizzes"
                end
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                Listar cuestionarios
              </NavLink>

              <NavLink
                to="/quizzes/create"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                Crear cuestionario
              </NavLink>
            </div>

            <div className="nav-menu-bottom">
              <button
                className="nav-item logout-btn"
                onClick={(e) => {
                  e.preventDefault(); 
                  setIsModalOpen(true);    
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </nav>
        </aside>
      </div>

      <LogoutModal 
        isOpen={isModalOpen} 
        onConfirm={handleLogout} 
        onCancel={() => setIsModalOpen(false)} 
      />
    </>
  );
}

export default Sidebar;