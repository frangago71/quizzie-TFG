import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { authService } from "./authService";
import { useToast } from "../context/ToastContext";
import { User, Mail, Trash2, ShieldAlert, KeyRound, Pencil } from "lucide-react";
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
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get<TeacherProfile>("/users/me");
        setProfile(response.data);
        setEditUsername(response.data.username);
      } catch (err) {
        console.error("Error al obtener perfil:", err);
        toast.error("No se pudo cargar el perfil del profesor.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleStartEditing = () => {
    if (profile) {
      setEditUsername(profile.username);
      setIsEditing(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (profile) {
      setEditUsername(profile.username);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) {
      toast.error("El nombre de usuario no puede estar vacío.");
      return;
    }
    if (editUsername.trim().length < 3) {
      toast.error("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }
    setSaveLoading(true);
    try {
      const response = await api.put<TeacherProfile>("/users/me", {
        username: editUsername.trim(),
      });
      setProfile(response.data);
      setIsEditing(false);
      toast.success("Perfil actualizado con éxito.");
    } catch (err: unknown) {
      console.error("Error al actualizar perfil:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(
        error.response?.data?.detail || "No se pudo actualizar el perfil."
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRecoverPassword = async () => {
    if (!profile?.email) return;
    setRecoverLoading(true);
    try {
      await api.post("/users/forgot-password", { email: profile.email });
      authService.logout();
      sessionStorage.setItem("toast_success", "Código de recuperación enviado. Revisa tu correo electrónico.");
      globalThis.location.href = `/reset-password?email=${encodeURIComponent(profile.email)}`;
    } catch (err: unknown) {
      console.error("Error al iniciar recuperación:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(
        error.response?.data?.detail ||
        "Error al solicitar el código de recuperación."
      );
      setRecoverLoading(false);
    }
  };

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

        <div className="profile-details-section">
          <h3>Datos personales</h3>
          <p className="section-desc">
            Gestiona tu nombre de usuario y tu dirección de correo electrónico.
          </p>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="profile-edit-form">
              <div className="profile-info-section">
                <div className="profile-info-row editing">
                  <div className="info-icon-container">
                    <User size={20} />
                  </div>
                  <div className="info-details">
                    <label htmlFor="edit-username-input">NOMBRE DE USUARIO</label>
                    <input
                      id="edit-username-input"
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="profile-edit-input"
                      disabled={saveLoading}
                      maxLength={50}
                      required
                      autoFocus
                    />
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

              <div className="profile-edit-actions">
                <button
                  type="submit"
                  className="btn-main magenta max"
                  disabled={saveLoading}
                >
                  {saveLoading ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  className="btn-profile-cancel"
                  onClick={handleCancelEditing}
                  disabled={saveLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-edit-form">
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

              <div className="profile-edit-actions">
                <button
                  type="button"
                  className="btn-main magenta max"
                  onClick={handleStartEditing}
                >
                  <Pencil size={18} />
                  Editar Perfil
                </button>
              </div>
            </div>
          )}
        </div>


        <div className="profile-security-section">
          <h3>Seguridad</h3>
          <p>
            ¿Quieres restablecer tu contraseña? Te enviaremos un código de recuperación
            a tu correo electrónico para que puedas crear una nueva clave.
          </p>
          <button
            type="button"
            className="btn-main cyan max"
            onClick={handleRecoverPassword}
            disabled={recoverLoading}
          >
            <KeyRound size={18} />
            {recoverLoading ? "Enviando código..." : "Restablecer mi contraseña"}
          </button>
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
