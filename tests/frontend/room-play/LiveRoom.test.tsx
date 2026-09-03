import {
  render,
  screen,
  act,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LiveRoom from "@/room-play/LiveRoom";
import { RoomProvider } from "@/context/RoomContext";
import { ToastProvider } from "@/context/ToastContext";
import api from "@/api";

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  close = vi.fn();

  url: string = "";
  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  send() {}

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

vi.mock("@/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  WS_BASE_URL: "ws://localhost:8000/api/v1",
}));

describe("LiveRoom Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    MockWebSocket.instances = [];
  });

  const mockRoomData = {
    id: 1,
    join_code: "123456",
    status: "live",
    phase: "playing",
    quiz_id: 10,
    answer_time: 30,
    question_id: 5,
    current_question_index: 0,
    text: "¿Cuál es el río más largo?",
    options: [
      { id: 101, text: "Amazonas", is_correct: true },
      { id: 102, text: "Nilo", is_correct: false },
    ],
    show_answers_count: true,
    answers_count: 3,
    time_left: 25,
  };

  const renderComponent = (roomId = "1") =>
    render(
      <ToastProvider>
        <RoomProvider>
          <MemoryRouter initialEntries={[`/room/${roomId}`]}>
            <Routes>
              <Route path="/room/:id" element={<LiveRoom />} />
              <Route path="/lobby/:id" element={<div>Lobby View</div>} />
            </Routes>
          </MemoryRouter>
        </RoomProvider>
      </ToastProvider>,
    );

  it("renders synchronizing loading state when room is null", () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText("Sincronizando sala...")).toBeInTheDocument();
  });

  it("syncs live room data and renders AnsweringPhase", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("¿Cuál es el río más largo?"),
      ).toBeInTheDocument();
    });
  });

  it("handles results phase and leaderboard phase transitions", async () => {
    const resultsRoomData = {
      ...mockRoomData,
      phase: "results",
      statistics: { "101": 3, "102": 1 },
      correct_option_id: 101,
    };

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: resultsRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("¿Cuál es el río más largo?"),
      ).toBeInTheDocument();
    });
  });

  it("renders FinalScreen when room status is finished", async () => {
    const finishedRoomData = {
      ...mockRoomData,
      status: "finished",
      leaderboard: [{ name: "Ana", score: 100 }],
    };

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: finishedRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Ana")).toBeInTheDocument();
    });
  });

  it("handles WebSocket messages: next_question, show_results, show_leaderboard, timer_update", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("¿Cuál es el río más largo?"),
      ).toBeInTheDocument();
    });

    const ws = MockWebSocket.instances[0];

    // timer_update
    await act(async () => {
      ws.simulateMessage({
        type: "timer_update",
        data: { time_left: 10, is_paused: false },
      });
    });

    // answer_submitted
    await act(async () => {
      ws.simulateMessage({
        type: "answer_submitted",
        data: { answers_count: 5 },
      });
    });

    // show_results
    await act(async () => {
      ws.simulateMessage({
        type: "show_results",
        data: {
          statistics: { "101": 4 },
          correct_option_id: 101,
          show_ranking: true,
        },
      });
    });

    // show_leaderboard
    await act(async () => {
      ws.simulateMessage({
        type: "show_leaderboard",
        data: {
          leaderboard: [{ name: "Juan", score: 90 }],
          show_ranking: true,
        },
      });
    });

    // room_finish
    await act(async () => {
      ws.simulateMessage({ type: "room_finish", data: {} });
    });
  });

  it("handles answers_visibility_updated and room_verifying WebSocket messages", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("¿Cuál es el río más largo?"),
      ).toBeInTheDocument();
    });

    const ws = MockWebSocket.instances[0];

    await act(async () => {
      ws.simulateMessage({
        type: "answers_visibility_updated",
        data: { show_answers_count: false },
      });
    });

    await act(async () => {
      ws.simulateMessage({ type: "room_verifying", data: {} });
    });

    await act(async () => {
      ws.simulateMessage({ type: "participant_verified", data: {} });
    });
  });

  it("handles host actions: handleNextQuestion, handleShowLeaderboard, handleShowResults, handleStopTimer, handleSubmitAnswer", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });

    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    // Ensure it's host mode
    sessionStorage.setItem("roomId", "1");
    // No participantId means host

    renderComponent("1");

    await waitFor(() => {
      expect(
        screen.getByText("¿Cuál es el río más largo?"),
      ).toBeInTheDocument();
    });

    const ws = MockWebSocket.instances[0];

    // Trigger handleStopTimer
    const stopTimerBtn = screen.getByRole("button", {
      name: /Terminar tiempo/i,
    });
    fireEvent.click(stopTimerBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/stage/rooms/1/timer/stop");
    });

    // Simulate timer ended
    await act(async () => {
      ws.simulateMessage({
        type: "timer_update",
        data: { time_left: 0, is_paused: false },
      });
    });

    // Handle show results
    const showResultsBtn = screen.getByRole("button", {
      name: /Ver estadísticas/i,
    });
    fireEvent.click(showResultsBtn);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/stage/rooms/1/questions/5/finish",
      );
    });

    // Simulate results phase
    await act(async () => {
      ws.simulateMessage({
        type: "show_results",
        data: {
          statistics: { "101": 2 },
          correct_option_id: 101,
          show_ranking: true,
        },
      });
    });

    // Handle show leaderboard
    const showLeaderboardBtn = screen.getByRole("button", {
      name: /Ver Ranking/i,
    });
    fireEvent.click(showLeaderboardBtn);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/stage/rooms/1/leaderboard/show");
    });

    // Simulate leaderboard phase
    await act(async () => {
      ws.simulateMessage({
        type: "show_leaderboard",
        data: { leaderboard: [], show_ranking: true },
      });
    });

    // Handle next question
    const nextBtn = screen.getByRole("button", { name: /Siguiente/i });
    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/stage/rooms/1/next-question");
    });
  });

  it("handles student action: handleSubmitAnswer", async () => {
    sessionStorage.setItem("roomId", "1");
    sessionStorage.setItem("participantId", "10");
    sessionStorage.setItem("userNickname", "Student"); // Important to set isHost = false

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });

    vi.mocked(api.post).mockResolvedValue({ data: {} });

    renderComponent("1");

    await waitFor(() => {
      expect(
        screen.getByText("¿Cuál es el río más largo?"),
      ).toBeInTheDocument();
    });

    // Select option
    const optionBtn = screen.getByText("Amazonas");
    fireEvent.click(optionBtn);

    // Send answer
    const sendBtn = screen.getByRole("button", { name: /Enviar respuesta/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/stage/answers", null, {
        params: {
          participant_id: 10,
          option_id: 101,
          question_id: 5,
        },
      });
    });
  });

  it("handles toggle answers visibility", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockRoomData })
      .mockResolvedValueOnce({ data: { title: "Geografía" } });

    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    renderComponent("1");

    await waitFor(() => {
      expect(
        screen.getByText("¿Cuál es el río más largo?"),
      ).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole("button", { name: /Ocultar contador/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/stage/rooms/1/toggle-answers-visibility",
      );
    });
  });
});
