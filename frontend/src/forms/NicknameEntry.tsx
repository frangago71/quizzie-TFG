import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NicknameEntry.css';

interface NicknameEntryProps {
  roomCode: string;
  roomId: number;
  onNicknameExists: (studentId: number, nickname: string) => void;
  onNicknameNotFound: (nickname: string) => void;
  onBack: () => void;
}

const NicknameEntry: React.FC<NicknameEntryProps> = ({ 
  roomCode, roomId, onNicknameExists, onNicknameNotFound, onBack 
}) => {
  const [nickname, setNickname] = useState('');
  const [roomStatus, setRoomStatus] = useState<string>('waiting'); 
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchRoomStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/content/rooms/verify/${roomCode}`);
        if (response.data.status) setRoomStatus(response.data.status);
      } catch (error) {
        console.error(`Error al recuperar el estado de la sala:`, error);
      }
    };
    fetchRoomStatus();
  }, [roomCode]);

  const handleVerifyNickname = async () => {
    const cleanNickname = nickname.trim();
    if (!cleanNickname || isProcessing) return;

    setIsProcessing(true);
    try {
      const verifyRes = await axios.get(`http://localhost:8000/users/students/verify/${cleanNickname}`);
      
      if (verifyRes.data.exists) {
        alert("¡Nickname verificado! Bienvenido de nuevo.");
        await axios.post(`http://localhost:8000/content/participants`, null, {
          params: {
            student_id: verifyRes.data.student_id,
            room_id: roomId
          }
        });
        onNicknameExists(verifyRes.data.student_id, verifyRes.data.nickname);
      } else {
        alert("El nickname no existe. Redirigiendo al registro...");
        onNicknameNotFound(cleanNickname);
      }

    } catch (error: any) {
      alert(error.response?.data?.detail || "Error al conectar con el servidor");
    } finally {
      setIsProcessing(false);
    }
  };

  const statusInfo = roomStatus === 'live' 
    ? { text: 'En curso', class: 'status-live' } 
    : { text: 'En espera', class: 'status-waiting' };

  return (
    <div className="join-container">
      <div className="join-header-text">
        <h2>Sala {roomCode}</h2>
        <p>Introduce tu uvus para unirte a la sala.</p>
      </div>

      <div className="join-card">
        <span className="code-label">¿Cómo te llamas?</span>
        <div className="nickname-input-wrapper">
          <span className="at-icon">@</span>
          <input
            type="text"
            placeholder="ABCD123"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="nickname-input"
            autoFocus
            disabled={isProcessing}
          />
        </div>

        <div className="action-buttons">
          <button 
            className="btn-main magenta full-width"
            onClick={handleVerifyNickname}
            disabled={!nickname.trim() || isProcessing}
          >
            {isProcessing ? 'Entrando...' : 'Siguiente'}
          </button>
          <button className="btn-back-link" onClick={onBack} disabled={isProcessing}>
            Volver atrás
          </button>
        </div>
      </div>

      <div className="room-info-footer">
        <span className={`room-status ${statusInfo.class}`}>
          {statusInfo.text}
        </span>
      </div>
    </div>
  );
};

export default NicknameEntry;