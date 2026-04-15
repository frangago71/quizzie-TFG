import React, { useState } from 'react';
import api from '../api';
import { TriangleAlert } from 'lucide-react';
import './NewNickname.css';

interface NewNicknameProps {
  nickname: string;
  roomId: number;
  onConfirm: (name: string, participantId: number) => void;
  onCancel: () => void;
}

const NewNickname: React.FC<NewNicknameProps> = ({ nickname, roomId, onConfirm, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleCreateAndJoin = async () => {
    setLoading(true);
    try {
      const resStudent = await api.post(`/users/students?nickname=${nickname}`);
      const newStudentId = resStudent.data.student_id;

      alert("Estudiante registrado. Uniéndolo a la sala...");

      const resParticipant = await api.post(`/stage/participants`, null, {
        params: { student_id: newStudentId, room_id: roomId }
      });

      onConfirm(nickname, resParticipant.data.participant_id);

    } catch (err: any) {
      alert("Error al registrar: " + (err.response?.data?.detail || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content join-card">
        <div className="notice-icon">
          <TriangleAlert size={45} strokeWidth={2.5} />
        </div>

        <h3>Estudiante no encontrado</h3>

        <p className="modal-description">
          El uvus <strong>@{nickname}</strong> no está en nuestra base de datos.
          ¿Deseas registrarlo?
        </p>

        <div className="modal-actions">
          <button
            className="btn-main magenta"
            onClick={handleCreateAndJoin}
            disabled={loading}
          >
            {loading ? 'Creando perfil...' : 'Crear nuevo estudiante'}
          </button>

          <button
            className="btn-back-link"
            onClick={onCancel}
            disabled={loading}
          >
            Modificar uvus
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewNickname;