import React from 'react';
import '../auth/Modal.css';

interface DeleteQuizModalProps {
  isOpen: boolean;
  onConfirm: (hardDelete: boolean) => void;
  onCancel: () => void;
}

const DeleteQuizModal: React.FC<DeleteQuizModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>¿Borrar cuestionario?</h2>
          <p>Puedes elegir si deseas borrar solo el cuestionario o también las salas (historial) asociadas a él.</p>
        </div>

        <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
          <button className="btn-modal-primary cyan" onClick={() => onConfirm(false)} style={{ width: '100%' }}>
            Borrar cuestionario
          </button>
          <button className="btn-modal-primary" onClick={() => onConfirm(true)} style={{ width: '100%' }}>
            Borrar cuestionario y sus salas
          </button>
          <button className="btn-modal-secondary" onClick={onCancel} style={{ width: '100%' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteQuizModal;
