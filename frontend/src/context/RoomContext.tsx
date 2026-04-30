import { createContext, useContext, useState, type ReactNode } from "react";
import type { RoomData } from "../types.ts";

interface RoomContextType {
  roomCode: string;
  setRoomCode: (code: string) => void;
  roomId: number | null;
  setRoomId: (id: number | null) => void;
  userNickname: string | undefined;
  setUserNickname: (name: string | undefined) => void;
  participantId: number | null;
  setParticipantId: (id: number | null) => void;
  roomData: RoomData | string[] | null;
  setRoomData: React.Dispatch<React.SetStateAction<RoomData | string[] | null>>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [roomCode, setRoomCodeState] = useState(
    sessionStorage.getItem("roomCode") || "",
  );
  const [roomId, setRoomIdState] = useState<number | null>(() => {
    const savedId = sessionStorage.getItem("roomId");
    return savedId ? Number(savedId) : null;
  });
  const [userNickname, setUserNicknameState] = useState<string | undefined>(
    sessionStorage.getItem("userNickname") || undefined,
  );
  const [participantId, setParticipantIdState] = useState<number | null>(() => {
    const savedPId = sessionStorage.getItem("participantId");
    return savedPId ? Number(savedPId) : null;
  });
  const [roomData, setRoomData] = useState<RoomData | string[] | null>(null);

  const setRoomCode = (code: string) => {
    setRoomCodeState(code);
    sessionStorage.setItem("roomCode", code);
  };

  const setRoomId = (id: number | null) => {
    setRoomIdState(id);
    if (id) sessionStorage.setItem("roomId", id.toString());
    else sessionStorage.removeItem("roomId");
  };

  const setUserNickname = (name: string | undefined) => {
    setUserNicknameState(name);
    if (name) sessionStorage.setItem("userNickname", name);
    else sessionStorage.removeItem("userNickname");
  };

  const setParticipantId = (id: number | null) => {
    setParticipantIdState(id);
    if (id) sessionStorage.setItem("participantId", id.toString());
    else sessionStorage.removeItem("participantId");
  };

  return (
    <RoomContext.Provider
      value={{
        roomCode,
        setRoomCode,
        roomId,
        setRoomId,
        userNickname,
        setUserNickname,
        participantId,
        setParticipantId,
        roomData,
        setRoomData,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context)
    throw new Error("useRoom debe usarse dentro de un RoomProvider");
  return context;
};
