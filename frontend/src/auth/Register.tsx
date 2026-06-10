import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "./authService";
import { useToast } from "../context/ToastContext";
import { type RegisterRequest } from "../types";
import "./Login.css";

export const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterRequest>({
    username: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (authService.isLoggedIn()) {
      navigate("/quizzes", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.username.trim().length < 3) {
      setError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }
    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (formData.password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await authService.register(formData);

      await authService.login({
        email: formData.email,
        password: formData.password,
      });

      sessionStorage.setItem("toast_success", "¡Registro completado con éxito!");
      globalThis.location.href = "/quizzes";
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      const errMsg = errorObj.message || "Error al registrar la cuenta";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-container register-container">
      <div className="join-header-text register-header">
        <h2>Registro de Profesores</h2>
        <p>Crea tu cuenta de profesor para empezar a gestionar tus cuestionarios.</p>
      </div>

      <div className="join-card register-card">
        <form onSubmit={handleSubmit}>
          <div className="input-field-group">
            <label htmlFor="username" className="code-label">
              NOMBRE DE USUARIO
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="login-input-text"
              placeholder="Ej. Miguel de Cervantes"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-field-group">
            <label htmlFor="email" className="code-label">
              EMAIL
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="login-input-text"
              placeholder="profesor@quizzie.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-field-group">
            <label htmlFor="password" className="code-label">
              CONTRASEÑA
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="login-input-text"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-field-group">
            <label htmlFor="confirmPassword" className="code-label">
              CONFIRMAR CONTRASEÑA
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="login-input-text"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-main cyan" disabled={loading}>
            <span className="play-icon">{loading ? "..." : "▶"}</span>
            {loading ? " Registrando..." : " Registrarse"}
          </button>
        </form>
        <div className="login-footer-action">
          <button
            onClick={() => navigate("/login")}
            className="back-link-text"
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>
          <button
            onClick={() => globalThis.history.back()}
            className="back-link-text"
          >
            Ir a zona de alumnos
          </button>
        </div>
      </div>
    </div>
  );
};
