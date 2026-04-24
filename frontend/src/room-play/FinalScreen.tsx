import { Star, Medal, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useRoom } from '../context/RoomContext.tsx';
import './LeaderboardPhase.css';
import './FinalScreen.css';

interface Props {
  isHost: boolean;
  data?: { name: string; score: number }[];
  status?: string;
}

const FinalScreen: React.FC<Props> = ({ isHost, data = [], status = 'FINISHED' }) => {
  const navigate = useNavigate();
  const { roomId, participantId, userNickname } = useRoom();
  const [stats, setStats] = useState<{ 
    score: number, 
    correct_answers: number, 
    total_questions: number,
    verification_token?: string,
    is_verified?: boolean
  } | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  useEffect(() => {
    if (isHost || !roomId || !participantId) return;
    const fetchStats = async () => {
      try {
        const res = await api.get(`/stage/rooms/${roomId}/participants/${participantId}/stats`);
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, [isHost, roomId, participantId]);

  const first = data[0] || null;
  const second = data[1] || null;
  const third = data[2] || null;

  return (
    <div className="live-room-wrapper podium-screen-container animate-fade-in final-screen-container" style={{ justifyContent: isHost ? 'flex-start' : 'center' }}>
      <div className="podium-titles">
        <h1 className="podium-main-title final-screen-title">¡Cuestionario finalizado!</h1>
        <h2 className="podium-subtitle final-screen-subtitle">
          {isHost 
            ? "Más adelante podrás escanear los QR de los alumnos desde el historial de salas." 
            : "¡Buen trabajo! Estos son tus resultados:"}
        </h2>
      </div>

      {!isHost ? (
        <>
          {stats ? (
            <div className="final-stats-card">
              <h1 className="final-score">{stats.score.toLocaleString()} pts</h1>
              <p className="final-score-text">
                Has respondido <strong className="final-score-highlight">{stats.correct_answers}</strong> correctas sobre {stats.total_questions} en total.
              </p>
            </div>
          ) : (
            <div style={{ padding: '40px' }}>Cargando resultados...</div>
          )}

          {status === 'VERIFYING' && stats?.verification_token ? (
            <div className="final-info-card qr-card animate-scale-in">
              <h3 className="final-info-title">Tu Código de Verificación</h3>
              <div className="qr-wrapper">
                <QRCodeSVG 
                  value={JSON.stringify({ 
                    nickname: userNickname, 
                    token: stats.verification_token,
                    roomId: roomId,
                    score: stats.score
                  })} 
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>
              {stats.is_verified ? (
                <div className="verification-badge success">
                  <CheckCircle size={20} />
                  <span>Verificado</span>
                </div>
              ) : (
                <p className="final-info-text highlight">
                  Muestra este código a tu profesor para validar tu nota.
                </p>
              )}
            </div>
          ) : (
            <div className="final-info-card final-info-card-faded">
              <h3 className="final-info-title">Verificación QR</h3>
              <p className="final-info-text">
                {status === 'FINISHED' 
                  ? "La fase de verificación ha terminado." 
                  : "Próximamente se mostrará aquí tu código QR para verificar tu nota con el profesor."}
              </p>
            </div>
          )}

          <button 
            className="btn-main magenta final-button" 
            onClick={() => {
              if (status === 'VERIFYING' && !stats?.is_verified) {
                setShowExitModal(true);
              } else {
                navigate('/');
              }
            }}
          >
            Salir
          </button>

          {showExitModal && (
            <div className="modal-overlay">
              <div className="modal-content warning-modal">
                <AlertTriangle size={48} className="warning-icon" />
                <h2>¿Estás seguro de que quieres salir?</h2>
                <p>Tu nota aún no ha sido verificada por el profesor. Si sales ahora, es posible que no se guarde correctamente.</p>
                <div className="modal-actions">
                  <button className="btn-main cyan" onClick={() => setShowExitModal(false)}>Permanecer</button>
                  <button className="btn-main magenta" onClick={() => navigate('/')}>Salir de todos modos</button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="podium-wrapper" style={{ marginTop: '20px', marginBottom: '40px' }}>
            <div className="podium-column animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {second && (
                <>
                  <span className="p-name">{second.name}</span>
                  <span className="p-score score-silver">{second.score.toLocaleString()} pts</span>
                </>
              )}
              <div className="p-bar bar-silver" style={{ height: '100px' }}>
                <div className="p-medal"><Medal size={24} /></div>
              </div>
            </div>

            <div className="podium-column animate-slide-up">
              {first && (
                <>
                  <span className="p-name name-gold">{first.name}</span>
                  <span className="p-score score-gold">{first.score.toLocaleString()} pts</span>
                </>
              )}
              <div className="p-bar bar-gold" style={{ height: '130px' }}>
                <div className="p-medal"><Star size={28} fill="white" stroke="transparent" /></div>
              </div>
            </div>

            <div className="podium-column animate-slide-up" style={{ animationDelay: '0.4s' }}>
              {third && (
                <>
                  <span className="p-name">{third.name}</span>
                  <span className="p-score score-bronze">{third.score.toLocaleString()} pts</span>
                </>
              )}
              <div className="p-bar bar-bronze" style={{ height: '80px' }}>
                <div className="p-medal"><Medal size={24} /></div>
              </div>
            </div>
          </div>

          <div className="final-actions">
            <div className="final-info-card">
              <Users size={32} style={{ color: 'var(--text-light)', marginBottom: '10px' }} />
              <h3 className="final-info-title">
                {status === 'VERIFYING' ? 'Fase de Verificación Activa' : 'Fase de verificación finalizada'}
              </h3>
              <p className="final-info-text">
                {status === 'VERIFYING' 
                  ? 'Escanea los códigos QR de tus alumnos para validar sus resultados.' 
                  : 'Todos los resultados han sido procesados.'}
              </p>
            </div>
            
            {status === 'VERIFYING' ? (
              <button className="btn-main magenta big" onClick={async () => {
                if (window.confirm("¿Seguro que quieres cerrar la fase de verificación? Los alumnos ya no podrán validar sus notas.")) {
                  try {
                    await api.post(`/stage/rooms/${roomId}/finish`);
                  } catch (err) {
                    console.error(err);
                  }
                }
              }}>
                Finalizar Verificación
              </button>
            ) : (
              <button className="btn-main cyan big" onClick={() => navigate('/dashboard')}>
                Volver al panel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FinalScreen;
