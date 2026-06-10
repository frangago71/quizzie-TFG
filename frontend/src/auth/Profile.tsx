import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { authService } from "./authService";
import { useToast } from "../context/ToastContext";
import { User, Mail, Trash2, ShieldAlert } from "lucide-react";
import "./Profile.css";
import "./Modal.css";

interface TeacherProfile {
  username: string;
  email: string;
}

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get<TeacherProfile>("/users/me");
        setProfile(response.data);
      } catch (err) {
        console.error("Error al obtener perfil:", err);
        toast.error("No se pudo cargar el perfil del profesor.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleDeleteAccount = async () => {
    if (!password.trim()) {
      toast.error("Por favor, introduce tu contraseña.");
      return;
    }
    setDeleteLoading(true);
    try {
      await api.delete("/users/me", { data: { password } });
      authService.logout();
      sessionStorage.setItem("toast_success", "Tu cuenta ha sido eliminada permanentemente.");
      globalThis.location.href = "/login";
    } catch (err: unknown) {
      console.error("Error al eliminar cuenta:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(
        error.response?.data?.detail ||
        "Hubo un error al eliminar tu cuenta. Inténtalo de nuevo."
      );
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Cargando perfil...</div>;
  }

  if (!profile) {
    return (
      <div className="profile-error-container">
        <h3>Error al cargar el perfil</h3>
        <p>Por favor, intenta iniciar sesión de nuevo.</p>
        <button className="btn-main cyan" onClick={() => navigate("/login")}>
          Ir a Login
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      <header className="profile-header">
        <h1>Mi Perfil</h1>
        <p>Gestiona tu cuenta y la configuración de privacidad.</p>
      </header>

      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar-circle">
            <User size={48} className="profile-avatar-icon" />
          </div>
          <h2 className="profile-display-name">{profile.username}</h2>
          <span className="profile-badge">Profesor</span>
        </div>

        <div className="profile-info-section">
          <div className="profile-info-row">
            <div className="info-icon-container">
              <User size={20} />
            </div>
            <div className="info-details">
              <label>NOMBRE DE USUARIO</label>
              <p>{profile.username}</p>
            </div>
          </div>

          <div className="profile-info-row">
            <div className="info-icon-container">
              <Mail size={20} />
            </div>
            <div className="info-details">
              <label>CORREO ELECTRÓNICO</label>
              <p>{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="profile-danger-zone">
          <h3>Zona de peligro</h3>
          <p>
            Al eliminar tu cuenta se borrarán permanentemente todos tus cuestionarios,
            salas, grupos, estudiantes y datos de juego. Esta acción no se puede deshacer.
          </p>
          <button
            type="button"
            className="btn-main danger max"
            onClick={() => setIsModalOpen(true)}
          >
            <Trash2 size={18} />
            Eliminar mi cuenta
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteLoading) {
              setIsModalOpen(false);
              setPassword("");
            }
          }}
        >
          <button
            className="modal-backdrop-button"
            onClick={() => {
              if (!deleteLoading) {
                setIsModalOpen(false);
                setPassword("");
              }
            }}
            aria-label="Cerrar ventana emergente"
          />
          <div className="modal-card" role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="modal-header">
              <div className="modal-warning-icon-container">
                <ShieldAlert size={36} color="var(--color-red)" />
              </div>
              <h2>¿Eliminar cuenta permanentemente?</h2>
              <p>
                Esta acción es definitiva. Se borrarán todos tus datos en cumplimiento con el RGPD.
                Por favor, introduce tu contraseña para confirmar.
              </p>
            </div>
            <div className="modal-input-group">
              <label htmlFor="confirm-password">CONTRASEÑA</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Escribe tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input-text confirm-pass-input"
                disabled={deleteLoading}
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn-modal-primary danger-btn"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !password}
              >
                {deleteLoading ? "Eliminando..." : "Eliminar cuenta"}
              </button>
              <button
                className="btn-modal-secondary danger-cancel-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  setPassword("");
                }}
                disabled={deleteLoading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
