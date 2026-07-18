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
    <div className="modal-overlay">
      <button
        type="button"
        className="modal-backdrop-button"
        onClick={onCancel}
        aria-label="Cerrar ventana emergente"
      />
      <div className="modal-card" role="dialog" aria-modal="true" tabIndex={-1}>
        <div className="modal-header">
          <h2>¿Cerrar sesión?</h2>
          <p>
            Tu sesión actual finalizará y tendrás que volver a entrar con tus
            credenciales.
          </p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-modal-primary"
            onClick={onConfirm}
          >
            Cerrar sesión
          </button>
          <button
            type="button"
            className="btn-modal-secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
