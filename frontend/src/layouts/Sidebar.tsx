import { NavLink, useNavigate } from 'react-router-dom';
import quizzieLogo from '../assets/logo-sidebar.png';
import { Menu, ChevronLeft } from 'lucide-react'; // Quitamos LogOut si no lo quieres
import { authService } from '../auth/authService';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

function Sidebar({ isOpen, toggle }: SidebarProps) {
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      toggle();
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
    if (window.innerWidth <= 768) toggle();
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
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Inicio
            </NavLink>

            <NavLink
              to="/quizzes"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Listar cuestionarios
            </NavLink>

            <NavLink
              to="/quizzes/create"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={handleLinkClick}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Crear cuestionario
            </NavLink>
            <NavLink
              to="/" 
              className="nav-item"
              onClick={(e) => {
                e.preventDefault(); 
                handleLogout();    
              }}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Cerrar sesión
            </NavLink>
          </nav>
        </aside>
      </div>
    </>
  );
}

export default Sidebar;