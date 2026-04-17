import { createContext, useContext, useState, type ReactNode } from 'react';
interface RoomContextType {
  roomCode: string;
  setRoomCode: (code: string) => void;
  roomId: number | null;
  setRoomId: (id: number | null) => void;
  userNickname: string | undefined;
  setUserNickname: (name: string | undefined) => void;
  participantId: number | null;
  setParticipantId: (id: number | null) => void;
  roomData: any;
  setRoomData: (data: any) => void;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [userNickname, setUserNickname] = useState<string | undefined>(undefined);
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [roomData, setRoomData] = useState<any>(null);

  return (
    <RoomContext.Provider value={{ 
      roomCode, setRoomCode, 
      roomId, setRoomId, 
      userNickname, setUserNickname, 
      participantId, setParticipantId,
      roomData, setRoomData 
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error("useRoom debe usarse dentro de un RoomProvider");
  return context;
};