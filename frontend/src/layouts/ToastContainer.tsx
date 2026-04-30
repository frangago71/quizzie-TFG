import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToast, type ToastType } from "../context/ToastContext";
import "./Toast.css";

const ICONS: Record<ToastType, React.ReactElement> = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-viewport" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button
            className="toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Cerrar notificación"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
