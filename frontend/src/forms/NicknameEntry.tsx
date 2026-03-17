import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NicknameEntry.css';

interface NicknameEntryProps {
  roomCode: string;
  onNicknameExists: (studentId: number, nickname: string) => void;
  onNicknameNotFound: (nickname: string) => void;
  onBack: () => void;
}

const NicknameEntry: React.FC<NicknameEntryProps> = ({ 
  roomCode, 
  onNicknameExists, 
  onNicknameNotFound,
  onBack 
}) => {
  const [nickname, setNickname] = useState('');
  const [roomStatus, setRoomStatus] = useState<string>('waiting'); 

  useEffect(() => {
    const fetchRoomStatus = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/content/rooms/verify/${roomCode}`);
        if (response.data.status) {
          setRoomStatus(response.data.status);
        }
      } catch (error) {
        console.error("Error al recuperar el estado de la sala", error);
      }
    };

    fetchRoomStatus();
  }, [roomCode]);

  const handleVerifyNickname = async () => {
    if (!nickname.trim()) return;
    try {
      const response = await axios.get(`http://localhost:8000/students/verify/${nickname}`);
      if (response.data.exists) {
        onNicknameExists(response.data.student_id, response.data.nickname);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        onNicknameNotFound(nickname.trim());
      } else {
        alert(error.response?.data?.detail || "Error al verificar el nickname");
      }
    }
  };

  const getStatusDisplay = () => {
    if (roomStatus === 'live') return { text: 'En curso', class: 'status-live' };
    return { text: 'En espera', class: 'status-waiting' };
  };

  const statusInfo = getStatusDisplay();

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
          />
        </div>

        <div className="action-buttons">
          <button 
            className="btn-main magenta"
            onClick={handleVerifyNickname}
            disabled={!nickname.trim()}
          >
            Siguiente
          </button>
          <button className="btn-back-link" onClick={onBack}>
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