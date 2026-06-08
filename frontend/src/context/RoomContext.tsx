import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { RoomData } from "../types.ts";

type RoomDataType = RoomData | string[] | null;

interface RoomContextType {
  roomCode: string;
  setRoomCode: (code: string) => void;
  roomId: number | null;
  setRoomId: (id: number | null) => void;
  userNickname: string | undefined;
  setUserNickname: (name: string | undefined) => void;
  participantId: number | null;
  setParticipantId: (id: number | null) => void;
  roomData: RoomDataType;
  setRoomData: React.Dispatch<React.SetStateAction<RoomDataType>>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [rawRoomCode, setRawRoomCode] = useState(() => {
    const saved = sessionStorage.getItem("roomCode");
    if (saved) {
      try {
        return decodeURIComponent(saved);
      } catch {
        return saved;
      }
    }
    return "";
  });

  const [rawRoomId, setRawRoomId] = useState<number | null>(() => {
    const savedId = sessionStorage.getItem("roomId");
    if (savedId) {
      try {
        const decoded = decodeURIComponent(savedId);
        return Number(decoded) || null;
      } catch {
        return Number(savedId) || null;
      }
    }
    return null;
  });

  const [rawUserNickname, setRawUserNickname] = useState<string | undefined>(
    () => {
      const saved = sessionStorage.getItem("userNickname");
      if (saved) {
        try {
          return decodeURIComponent(saved);
        } catch {
          return saved;
        }
      }
      return undefined;
    },
  );

  const [rawParticipantId, setRawParticipantId] = useState<number | null>(
    () => {
      const savedPId = sessionStorage.getItem("participantId");
      if (savedPId) {
        try {
          const decoded = decodeURIComponent(savedPId);
          return Number(decoded) || null;
        } catch {
          return Number(savedPId) || null;
        }
      }
      return null;
    },
  );

  const [roomData, setRoomData] = useState<RoomDataType>(null);

  const setRoomCode = useCallback((code: string) => {
    const cleanCode = code.replace(/[^a-zA-Z0-9_-]/g, "");
    const sanitized = encodeURIComponent(cleanCode);
    setRawRoomCode(cleanCode);
    sessionStorage.setItem("roomCode", sanitized);
  }, []);

  const setRoomId = useCallback((id: number | null) => {
    setRawRoomId(id);
    if (id !== null) {
      const cleanId = String(id).replace(/[^0-9]/g, "");
      const sanitized = encodeURIComponent(cleanId);
      sessionStorage.setItem("roomId", sanitized);
    } else {
      sessionStorage.removeItem("roomId");
    }
  }, []);

  const setUserNickname = useCallback((name: string | undefined) => {
    setRawUserNickname(name);
    if (name !== undefined) {
      const cleanNickname = name.replace(/[<>'"&]/g, "");
      const sanitized = encodeURIComponent(cleanNickname);
      sessionStorage.setItem("userNickname", sanitized);
    } else {
      sessionStorage.removeItem("userNickname");
    }
  }, []);

  const setParticipantId = useCallback((id: number | null) => {
    setRawParticipantId(id);
    if (id !== null) {
      const cleanParticipantId = String(id).replace(/[^0-9]/g, "");
      const sanitized = encodeURIComponent(cleanParticipantId);
      sessionStorage.setItem("participantId", sanitized);
    } else {
      sessionStorage.removeItem("participantId");
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      roomCode: rawRoomCode,
      setRoomCode,
      roomId: rawRoomId,
      setRoomId,
      userNickname: rawUserNickname,
      setUserNickname,
      participantId: rawParticipantId,
      setParticipantId,
      roomData,
      setRoomData,
    }),
    [
      rawRoomCode,
      setRoomCode,
      rawRoomId,
      setRoomId,
      rawUserNickname,
      setUserNickname,
      rawParticipantId,
      setParticipantId,
      roomData,
      setRoomData,
    ],
  );

  return (
    <RoomContext.Provider value={contextValue}>{children}</RoomContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context)
    throw new Error("useRoom debe usarse dentro de un RoomProvider");
  return context;
};
