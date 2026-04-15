import React, { useState, useEffect } from 'react';
import api from '../api.ts';
import NewNickname from './NewNickname.tsx';
import './NicknameEntry.css';

interface NicknameEntryProps {
  roomCode: string;
  roomId: number;
  onNicknameExists: (nickname: string, participantId: number) => void;
  onBack: () => void;
}

const NicknameEntry: React.FC<NicknameEntryProps> = ({
  roomCode, roomId, onNicknameExists, onBack
}) => {
  const [nickname, setNickname] = useState('');
  const [roomStatus, setRoomStatus] = useState<string>('waiting');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchRoomStatus = async () => {
      try {
        const response = await api.get(`/stage/rooms/verify/${roomCode}`);
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
    
    const patternA = /^[a-zA-Z]{3}\d{4}$/;
    const patternB = /^[a-zA-Z]{9,12}\d{0,2}$/;
    const isValid = patternA.test(cleanNickname) || patternB.test(cleanNickname);

    if (!isValid) {
      alert("Formato de uvus inválido.");
      return; 
    }

    setIsProcessing(true);
    try {
      const verifyRes = await api.get(`/users/students/verify/${cleanNickname}`);

      if (verifyRes.data.exists) {
        const partRes = await api.post(`/stage/participants`, null, {
          params: {
            student_id: verifyRes.data.student_id,
            room_id: roomId
          }
        });
        
        onNicknameExists(cleanNickname, partRes.data.participant_id);
        
      } else {
        setShowModal(true);
      }

    } catch (error: any) {
      alert("Error en el proceso: " + (error.response?.data?.detail || error.message));
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
        <p>Introduce tu uvus para unirte.</p>
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
            {isProcessing ? 'Procesando...' : 'Siguiente'}
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

      {showModal && (
        <NewNickname
          nickname={nickname.trim()}
          roomId={roomId}
          onConfirm={(name, participantId) => {
            setShowModal(false);
            onNicknameExists(name, participantId);
          }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default NicknameEntry;