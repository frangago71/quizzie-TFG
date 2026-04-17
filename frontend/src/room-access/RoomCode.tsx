import React, { useState, useRef } from 'react';
import api from '../api';
import './RoomCode.css';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext';

const RoomCode: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { setRoomCode, setRoomId } = useRoom();

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      alert("Introduce los 6 dígitos.");
      return;
    }

    try {
      const response = await api.get(`/stage/rooms/verify/${fullCode}`);

      if (response.data.success) {
        setRoomCode(fullCode);
        setRoomId(response.data.room_id);
        navigate(`/join/${fullCode}`);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Error al verificar el código";
      alert(errorMsg);
    }
  };


  return (
    <div className="join-container">
      <div className="join-header-text">
        <h2>¿Listo para el desafío?</h2>
        <p>Ingresa el código de sala para empezar.</p>
      </div>

      <div className="join-card">
        <span className="code-label">CÓDIGO DE SALA</span>

        <div className="code-inputs-group">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="code-box"
            />
          ))}
        </div>

        <button
          className="btn-main magenta"
          onClick={handleVerifyCode}
          disabled={code.some(d => d === '')}
        >
          <span className="play-icon">▶ Entrar</span>
        </button>
      </div>
    </div>
  );

};

export default RoomCode;