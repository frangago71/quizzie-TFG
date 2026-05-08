import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "./authService";
import { type LoginRequest } from "../types";
import "./Login.css";

export const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isLoggedIn()) {
      navigate("/quizzes", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.login(credentials);
      globalThis.location.href = "/quizzes";
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-container">
      <div className="join-header-text">
        <h2>Acceso Profesores</h2>
        <p>Introduce tus credenciales para gestionar tus cuestionarios.</p>
      </div>

      <div className="join-card">
        <form onSubmit={handleSubmit}>
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
              value={credentials.email}
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
              placeholder="••••••••"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-main cyan" disabled={loading}>
            <span className="play-icon">{loading ? "..." : "▶"}</span>
            {loading ? " Entrando" : " Entrar"}
          </button>
        </form>
        <div className="login-footer-action">
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
