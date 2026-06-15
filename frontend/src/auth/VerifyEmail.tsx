import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useToast } from "../context/ToastContext";
import "./Login.css";
import "../room-access/RoomCode.css";

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
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
    if (!email.trim() || !fullCode) {
      toast.error("Por favor, rellena todos los campos.");
      return;
    }
    if (fullCode.length !== 6) {
      toast.error("El código debe tener exactamente 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/users/verify-email", {
        email,
        code: fullCode,
      });

      if (response.data.access_token) {
        sessionStorage.setItem("token", response.data.access_token);
        sessionStorage.setItem(
          "toast_success",
          "¡Cuenta verificada con éxito! Has iniciado sesión automáticamente.",
        );
        globalThis.location.href = "/quizzes";
      } else {
        sessionStorage.setItem(
          "toast_success",
          "¡Cuenta verificada con éxito! Ya puedes iniciar sesión.",
        );
        globalThis.location.href = "/login";
      }
    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as { response?: { data?: { detail?: string } } };
      toast.error(
        errorObj.response?.data?.detail ||
          "Error al verificar el correo electrónico.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error("Por favor, introduce tu correo electrónico primero.");
      return;
    }

    setResendLoading(true);
    try {
      await api.post("/users/resend-verification", { email });
      toast.success("Código de verificación reenviado. Revisa tu correo.");
    } catch (err: unknown) {
      console.error(err);
      const errorObj = err as { response?: { data?: { detail?: string } } };
      toast.error(
        errorObj.response?.data?.detail || "Error al reenviar el código.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="join-container">
      <div className="join-header-text">
        <h2>Verifica tu Cuenta</h2>
        <p>Introduce el código de 6 dígitos que hemos enviado a tu email.</p>
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
            <label className="code-label">
              CÓDIGO DE VERIFICACIÓN (6 DÍGITOS)
            </label>
            <div className="code-inputs-group">
              {code.map((digit, index) => (
                <input
                  key={index}
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

          <button
            type="submit"
            className="btn-main cyan"
            disabled={loading || code.some((d) => d === "")}
          >
            <span>{loading ? "..." : "▶"}</span>
            {loading ? " Verificando..." : " Activar Cuenta"}
          </button>
        </form>

        <div className="login-footer-action">
          <button
            onClick={handleResend}
            className="back-link-text"
            disabled={resendLoading || loading}
            type="button"
          >
            {resendLoading
              ? "Enviando..."
              : "¿No has recibido el código? Reenviar"}
          </button>
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

export default VerifyEmail;
