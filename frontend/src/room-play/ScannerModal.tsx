import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
  onScan: (data: string) => void;
  onClose: () => void;
}

const ScannerModal: React.FC<Props> = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
      },
      (error) => {
        console.log("Error al escanear QR: ", error)
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Error clearing scanner", e));
    };
  }, [onScan]);

  return (
    <div className="modal-overlay">
      <div className="modal-content scanner-modal">
        <button className="modal-close" onClick={onClose}><X /></button>
        <h2 className="modal-title">Escanear QR de Alumno</h2>
        <div id="reader" style={{ width: '100%', overflow: 'hidden', borderRadius: '12px' }}></div>
        <p className="scanner-hint">Coloca el código QR del alumno frente a la cámara</p>
      </div>
    </div>
  );
};

export default ScannerModal;
