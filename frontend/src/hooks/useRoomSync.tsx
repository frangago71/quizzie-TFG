import { useState, useEffect } from "react";
import api from "../api";
import type { RoomData } from "../types.ts";
import { useNavigate } from "react-router-dom";

export function useRoomSync(roomId: number | null) {
  const [roomData, setRoomData] = useState<RoomData | string[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/stage/rooms/${roomId}`);
        const data = response.data;

        setRoomData(data);

        if (data.status === "LIVE") {
          navigate(`/live/${roomId}`);
        } else if (data.status === "FINISHED") {
          navigate("/");
        }
      } catch (error) {
        console.error("Error en el polling de sala:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId, navigate]);

  return { roomData, setRoomData };
}
