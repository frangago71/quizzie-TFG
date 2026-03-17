import React from 'react';
import './NicknameEntry.css';

interface NicknameEntryProps {
  roomCode: string;
  onNicknameExists: (studentId: number, nickname: string) => void;
  onNicknameNotFound: (nickname: string) => void;
  onBack: () => void;
}

const NicknameEntry: React.FC<NicknameEntryProps> = ({ 
  roomCode
}) => {  


  return (
        <div>
            <h2>¡Bienvenido a la sala {roomCode}!</h2>
            <p>Por hacer</p>
        </div>
    );
};

export default NicknameEntry;