import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useToast } from "../context/ToastContext";
import "./Login.css";
import "../room-access/RoomCode.css";

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const digitKeys = ["reset-digit-0", "reset-digit-1", "reset-digit-2", "reset-digit-3", "reset-digit-4", "reset-digit-5"];
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("").trim();
    if (!email.trim() || !fullCode || !newPassword || !confirmPassword) {
      toast.error("Por favor, rellena todos los campos.");
      return;
    }
    if (fullCode.length !== 6) {
      toast.error("El código debe tener exactamente 6 dígitos.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/users/reset-password", {
        email,
        code: fullCode,
        new_password: newPassword,
      });

      if (response.data.access_token) {
        sessionStorage.setItem("token", response.data.access_token);
        sessionStorage.setItem(
          "toast_success",
          "¡Contraseña restablecida con éxito! Has iniciado sesión automáticamente.",
        );
        globalThis.location.href = "/quizzes";
      } else {
        sessionStorage.setItem(
          "toast_success",
          "¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.",
        );
        globalThis.location.href = "/login";
      }
    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as { response?: { data?: { detail?: string } } };
      toast.error(
        errorObj.response?.data?.detail ||
          "Error al restablecer la contraseña.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-container">
      <div className="join-header-text">
        <h2>Restablece tu Contraseña</h2>
        <p>
          Introduce tu correo, el código de 6 dígitos recibido y tu nueva
          contraseña.
        </p>
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
              disabled={loading || !!emailParam}
            />
          </div>

          <div className="input-field-group">
            <span className="code-label">CÓDIGO DE RECUPERACIÓN</span>
            <div className="code-inputs-group">
              {code.map((digit, index) => (
                <input
                  key={digitKeys[index]}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="code-box cyan"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <div className="input-field-group">
            <label htmlFor="newPassword" className="code-label">
              NUEVA CONTRASEÑA
            </label>
            <input
              id="newPassword"
              type="password"
              className="login-input-text"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="input-field-group">
            <label htmlFor="confirmPassword" className="code-label">
              CONFIRMAR NUEVA CONTRASEÑA
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="login-input-text"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-main cyan wide"
            disabled={loading || code.includes("")}
          >
            <span>{loading ? "..." : "▶"}</span>
            {loading ? " Restableciendo..." : " Cambiar contraseña"}
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

export default ResetPassword;
