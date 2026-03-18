import React, { useState } from 'react';
import axios from 'axios';
import { TriangleAlert } from 'lucide-react';
import './NewNickname.css';

interface NewNicknameProps {
  nickname: string;
  roomId: number;
  onConfirm: (studentId: number, name: string) => void;
  onCancel: () => void;
}

const NewNickname: React.FC<NewNicknameProps> = ({ nickname, roomId, onConfirm, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleCreateAndJoin = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:8000/users/students?nickname=${nickname}`);
      const newId = res.data.student_id;

      alert("Estudiante registrado. Uniéndolo a la sala...");
      
      await axios.post(`http://localhost:8000/content/participants`, null, {
        params: { student_id: newId, room_id: roomId }
      });

      onConfirm(newId, nickname);
      
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