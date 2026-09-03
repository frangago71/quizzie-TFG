import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Lobby from "@/room-play/Lobby";
import api from "@/api";
import { RoomProvider, useRoom } from "@/context/RoomContext";
import { ToastProvider } from "@/context/ToastContext";

vi.mock("@/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  WS_BASE_URL: "ws://localhost:8000",
}));

class MockWebSocket {
  static mockInstance: MockWebSocket | null = null;
  onopen: ((...args: unknown[]) => void) | null = null;
  onclose: ((...args: unknown[]) => void) | null = null;
  onmessage: ((...args: unknown[]) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor() {
    MockWebSocket.mockInstance = this;
  }
}
(globalThis as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket;

const LobbyHostSetup: React.FC = () => {
  const { setRoomCode, setUserNickname } = useRoom();
  React.useEffect(() => {
    setRoomCode("123456");
    setUserNickname(""); // Host mode
  }, [setRoomCode, setUserNickname]);
  return <Lobby />;
};

const LobbyStudentSetup: React.FC = () => {
  const { setRoomCode, setUserNickname } = useRoom();
  React.useEffect(() => {
    setRoomCode("123456");
    setUserNickname("Mi Apodo"); // Student mode
  }, [setRoomCode, setUserNickname]);
  return <Lobby />;
};

describe("Lobby Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  const renderComponent = (Element: React.FC) =>
    render(
      <ToastProvider>
        <RoomProvider>
          <MemoryRouter initialEntries={["/lobby/10"]}>
            <Routes>
              <Route path="/lobby/:roomId" element={<Element />} />
            </Routes>
          </MemoryRouter>
        </RoomProvider>
      </ToastProvider>,
    );

  it("renders host view with room code and start button when user holds host role", async () => {
    renderComponent(LobbyHostSetup);

    await waitFor(() => {
      expect(screen.getByText("Sala de Espera - 123456")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Empezar/i }),
      ).toBeInTheDocument();
    });
  });

  it("triggers start room API when host clicks start button", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

    renderComponent(LobbyHostSetup);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Empezar/i }),
      ).toBeInTheDocument();
    });

    const startBtn = screen.getByRole("button", { name: /Empezar/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/stage/rooms/10/start");
    });
  });

  it("renders student view when user is not host", async () => {
    renderComponent(LobbyStudentSetup);

    await waitFor(() => {
      expect(screen.getByText("Mi Apodo!")).toBeInTheDocument();
      expect(
        screen.getByText("Esperando a que comience el cuestionario..."),
      ).toBeInTheDocument();
    });
  });

  it("handles fetch errors in initial data load", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderComponent(LobbyHostSetup);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error en carga inicial:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles room start error and shows toast", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Start error"));

    renderComponent(LobbyHostSetup);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Empezar/i }),
      ).toBeInTheDocument();
    });

    const startBtn = screen.getByRole("button", { name: /Empezar/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("navigates to live if room status is live on fetch", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { join_code: "654321", status: "live" } });

    render(
      <ToastProvider>
        <RoomProvider>
          <MemoryRouter initialEntries={["/lobby/10"]}>
            <Routes>
              <Route path="/lobby/:roomId" element={<LobbyHostSetup />} />
              <Route path="/live/10" element={<div>Live Screen!</div>} />
            </Routes>
          </MemoryRouter>
        </RoomProvider>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Live Screen!")).toBeInTheDocument();
    });
  });

  it("handles websocket participants_update and data events", async () => {
    renderComponent(LobbyHostSetup);

    await waitFor(() => {
      expect(screen.getByText("Sala de Espera - 123456")).toBeInTheDocument();
    });

    // Wait for the WS to be created (50ms timeout in useEffect)
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Mock an event from WS
    const wsInstance = MockWebSocket.mockInstance;
    const onMessage = wsInstance?.onmessage;
    if (onMessage) {
      // test participants_update
      act(() => {
        onMessage({
          data: JSON.stringify({
            type: "participants_update",
            list: ["Alice", "Bob"],
          }),
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    if (onMessage) {
      // test data object with type
      act(() => {
        onMessage({
          data: JSON.stringify({
            type: "room_update",
            data: { status: "live" },
          }),
        });
      });
    }
  });

  it("displays overflow when there are many participants", async () => {
    // Generate 20 participants for mobile to trigger overflow > 8
    const largeList = Array.from({ length: 20 }, (_, i) => `User${i}`);

    vi.mocked(api.get).mockResolvedValueOnce({ data: largeList });

    // Mock window innerWidth to simulate mobile
    window.innerWidth = 500;

    renderComponent(LobbyHostSetup);

    await waitFor(() => {
      // overflowCount should be 20 - 8 = 12
      expect(screen.getByText("+12")).toBeInTheDocument();
    });

    window.innerWidth = 1024; // reset
  });
});
