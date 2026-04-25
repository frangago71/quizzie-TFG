import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoom } from '../context/RoomContext.tsx';
import api from '../api.ts';
import { Users, PlayCircle, UserCircle2 } from 'lucide-react';
import './Lobby.css';
import { useToast } from '../context/ToastContext';

const Lobby: React.FC = () => {
  const { roomId: urlRoomId } = useParams();
  const navigate = useNavigate();
  const { roomId, roomCode, userNickname, roomData, setRoomData } = useRoom();
  const [isMobile] = useState(window.innerWidth <= 768);
  const { toast } = useToast();

  useEffect(() => {
    const idToUse = urlRoomId || roomId;
    if (!idToUse) return;

    const fetchInitialData = async () => {
      try {
        const res = await api.get(`/stage/rooms/${idToUse}/participants`);
        setRoomData(res.data);
      } catch (err) {
        console.error("Error en carga inicial:", err);
      }
    };
    fetchInitialData();

    const ws = new WebSocket(`ws://localhost:8000/stage/rooms/${idToUse}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Mensaje WS recibido:", data);

      if (data.type === 'participants_update') {
        setRoomData(data.list);
      } 
      else if (data.data && data.type) {
        setRoomData((prev: any) => {
          if (typeof prev !== 'object' || Array.isArray(prev)) {
            return { ...data.data, type: data.type };
          }
          return { ...prev, ...data.data, type: data.type };
        });
      }
    };

    ws.onclose = () => console.log("WebSocket desconectado");
    ws.onerror = (err) => console.error("Error en WebSocket:", err);

    return () => {
      ws.close();
    };
  }, [roomId, urlRoomId, setRoomData]);

  useEffect(() => {
    if (roomData?.status?.toUpperCase() === 'LIVE') {
      const idToUse = urlRoomId || roomId;
      navigate(`/live/${idToUse}`);
    }
  }, [roomData?.status, navigate, urlRoomId, roomId]);

  const handleStartRoom = async () => {
    try {
      await api.post(`/stage/rooms/${roomId}/start`);
    } catch (err) {
      toast.error("Error al iniciar la sala");
    }
  };

  const isHost = !userNickname;
  const nickname = userNickname;
  const participants = Array.isArray(roomData) ? roomData : [];

  const maxDisplay = isMobile ? 8 : 14;
  const displayedNames = [...participants].reverse().slice(0, maxDisplay);
  const hasOverflow = participants.length > maxDisplay;
  const overflowCount = participants.length - maxDisplay;

  return (
    <div className={`lobby-wrapper ${isHost ? 'is-host' : 'is-student'}`}>
      <header className="lobby-header">
        <div className="header-info">
          <h1>
            {isHost ? `Sala de Espera - ${roomCode}` :
              <>¡Estás dentro, <span className="accent-text">{nickname}!</span></>
            }
          </h1>
          <div className="lobby-status">
            <span className="dot"></span>
            <span className="status-text">
              {isHost ? "Esperando participantes..." : "Esperando a que comience el cuestionario..."}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <div className="stat-badge">
            <div className="stat-icon-box"><Users size={20} /></div>
            <div className="stat-content">
              <span className="stat-label">USUARIOS EN LA SALA</span>
              <span className="stat-number">{participants.length}</span>
            </div>
          </div>
          {isHost && (
            <button className="btn-start-game" onClick={handleStartRoom}>
              <PlayCircle size={18} />
              Empezar
            </button>
          )}
        </div>
      </header>

      <section className="participants-card">
        <div className="card-top">
          <h3>Participantes recientes</h3>
        </div>

        <div className="participants-grid">
          {hasOverflow && (
            <div className="participant-avatar-item">
              <div className="avatar-icon-wrapper overflow-bg">
                <span className="overflow-text">+{overflowCount}</span>
              </div>
              <span className="participant-name">...</span>
            </div>
          )}

          {displayedNames.map((pName, index) => (
            <div key={index} className="participant-avatar-item">
              <div className="avatar-icon-wrapper">
                <UserCircle2 size={38} strokeWidth={1.5} />
              </div>
              <span className="participant-name">{pName}</span>
            </div>
          ))}

          {participants.length === 0 && (
            <div className="empty-lobby">Aún no hay nadie aquí...</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Lobby;