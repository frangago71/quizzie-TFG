import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useToast } from "../context/ToastContext";
import "./Login.css";

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Por favor, introduce tu correo electrónico.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/users/forgot-password", { email });
      toast.success("Código de recuperación enviado. Revisa tu bandeja de entrada.");
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as { response?: { data?: { detail?: string } } };
      toast.error(errorObj.response?.data?.detail || "Error al solicitar la recuperación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-container">
      <div className="join-header-text">
        <h2>¿Olvidaste tu contraseña?</h2>
        <p>Introduce tu correo para recibir un código de recuperación de 6 dígitos.</p>
      </div>

      <div className="join-card">
        <form onSubmit={handleSubmit}>
          <div className="input-field-group">
            <label htmlFor="email" className="code-label">
              CORREO ELECTRÓNICO
            </label>
            <input
              id="email"
              type="email"
              className="login-input-text"
              placeholder="tu-correo@quizzie.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-main cyan wide" disabled={loading}>
            <span>{loading ? "..." : "▶"}</span>
            {loading ? " Enviando..." : " Solicitar código"}
          </button>
        </form>

        <div className="login-footer-action">
          <button
            onClick={() => navigate("/login")}
            className="back-link-text"
            type="button"
          >
            Volver a inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
