import React, { useEffect, useState } from 'react';
import { Users, PlayCircle, UserCircle2 } from 'lucide-react';
import './Lobby.css';
import axios from 'axios';

interface LobbyProps {
  roomId: number;
  nickname?: string;
  roomCode?: string;
  handleLiveRoom: (data: any) => void;
}

const Lobby: React.FC<LobbyProps> = ({ roomId, nickname, roomCode, handleLiveRoom }) => {
  const [participants, setParticipants] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isHost = !nickname;

  const handleStartRoom = async () => {
    try {
      const r = await axios.post(`http://localhost:8000/content/rooms/${roomId}/start`);
      handleLiveRoom(r.data);
      
    } catch (error) {
      console.error("Error al iniciar el quiz:", error);
      alert("No se pudo iniciar el cuestionario. Revisa la consola.");
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const fetchInitialParticipants = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/content/rooms/${roomId}/participants`);
        setParticipants(res.data);
      } catch (error) {
        console.error("Error al cargar participantes iniciales:", error);
      }
    };

    fetchInitialParticipants();

    const ws = new WebSocket(`ws://localhost:8000/content/rooms/${roomId}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "participants_update") {
        setParticipants(data.list); 
      }

      if (data.type === "room_start") {
        handleLiveRoom(data.data);
      }
    };

    return () => {
      ws.close();
      window.removeEventListener('resize', handleResize);
    };
  }, [roomId, handleLiveRoom]);

  const maxVisible = isMobile ? 12 : 15;
  const hasOverflow = participants.length > maxVisible;
  const overflowCount = hasOverflow ? (participants.length - (maxVisible - 1)) : 0;
  const displayedNames = hasOverflow ? participants.slice(-(maxVisible - 1)) : participants; 

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

          {displayedNames.map((p, index) => (
            <div key={index} className="participant-avatar-item">
              <div className="avatar-icon-wrapper">
                <UserCircle2 size={38} strokeWidth={1.5} />
              </div>
              <span className="participant-name">{p}</span>
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