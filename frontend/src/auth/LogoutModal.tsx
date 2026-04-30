import React from "react";
import "./Modal.css";

interface LogoutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>¿Cerrar sesión?</h2>
          <p>
            Tu sesión actual finalizará y tendrás que volver a entrar con tus
            credenciales.
          </p>
        </div>

        <div className="modal-actions">
          <button className="btn-modal-primary" onClick={onConfirm}>
            Cerrar sesión
          </button>
          <button className="btn-modal-secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
