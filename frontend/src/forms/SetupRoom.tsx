import React from 'react';
import './SetupRoom.css';

interface SetupRoomProps {
  quizId: number | null;
  onOpenSession: (joinCode: string) => void;
  onBack: () => void;
}

const SetupRoom: React.FC<SetupRoomProps> = ({ quizId }) => {

  return (
    <div>
      <h2>Configuración de la sala para el quiz {quizId}</h2>
      <p>Desde aquí podrás configurar opciones como el orden de las preguntas, ver la tabla de mejores puntuaciones, etc.</p>
    </div>
  );
};

export default SetupRoom;