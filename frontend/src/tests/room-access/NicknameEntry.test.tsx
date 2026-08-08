import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NicknameEntry from "../../room-access/NicknameEntry";
import { useRoom } from "../../context/RoomContext";
import { ToastProvider } from "../../context/ToastContext";
import api from "../../api";

vi.mock("../../context/RoomContext", () => ({
  useRoom: vi.fn(),
}));

vi.mock("../../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("NicknameEntry Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/join"]}>
          <Routes>
            <Route path="/join" element={<NicknameEntry />} />
            <Route path="/lobby/12" element={<div>Lobby Room 12</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders nickname input field and handles valid uvus verification", async () => {
    const setUserNickname = vi.fn();
    const setParticipantId = vi.fn();
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "123456",
      roomId: 12,
      setUserNickname,
      setParticipantId,
    } as unknown as ReturnType<typeof useRoom>);

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { status: "waiting" } })
      .mockResolvedValueOnce({ data: { exists: true, student_id: 1 } });
    vi.mocked(api.post).mockResolvedValueOnce({ data: { participant_id: 99 } });

    renderComponent();

    const input = screen.getByPlaceholderText("ABCD123");
    fireEvent.change(input, { target: { value: "abc1234" } });

    const button = screen.getByRole("button", { name: /Siguiente/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(setUserNickname).toHaveBeenCalledWith("abc1234");
      expect(setParticipantId).toHaveBeenCalledWith(99);
      expect(screen.getByText("Lobby Room 12")).toBeInTheDocument();
    });
  });

  it("opens NewNickname modal when student does not exist", async () => {
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "123456",
      roomId: 12,
      setUserNickname: vi.fn(),
      setParticipantId: vi.fn(),
    } as unknown as ReturnType<typeof useRoom>);

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { status: "waiting" } })
      .mockResolvedValueOnce({ data: { exists: false } });

    renderComponent();

    const input = screen.getByPlaceholderText("ABCD123");
    fireEvent.change(input, { target: { value: "xyz9999" } });

    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await waitFor(() => {
      expect(screen.getByText("Estudiante no encontrado")).toBeInTheDocument();
    });
  });

  it("handles invalid room code format", async () => {
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "INVALID_CODE_!@#",
      roomId: 12,
      setUserNickname: vi.fn(),
      setParticipantId: vi.fn(),
    } as unknown as ReturnType<typeof useRoom>);
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderComponent();

    expect(consoleSpy).toHaveBeenCalledWith("Código de sala inválido.");
    consoleSpy.mockRestore();
  });

  it("redirects to home if roomId is not present", () => {
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "123456",
      roomId: null, // No room id
      setUserNickname: vi.fn(),
      setParticipantId: vi.fn(),
    } as unknown as ReturnType<typeof useRoom>);

    renderComponent();
    // It should navigate to "/" and return null
    expect(screen.queryByPlaceholderText("ABCD123")).not.toBeInTheDocument();
  });

  it("handles error when fetching room status", async () => {
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "123456",
      roomId: 12,
      setUserNickname: vi.fn(),
      setParticipantId: vi.fn(),
    } as unknown as ReturnType<typeof useRoom>);
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network Error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderComponent();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error al recuperar el estado de la sala:",
        expect.any(Error),
      );
    });
    consoleSpy.mockRestore();
  });

  it("shows warning toast for invalid uvus format", () => {
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "123456",
      roomId: 12,
      setUserNickname: vi.fn(),
      setParticipantId: vi.fn(),
    } as unknown as ReturnType<typeof useRoom>);

    renderComponent();

    const input = screen.getByPlaceholderText("ABCD123");
    fireEvent.change(input, { target: { value: "invalid format uvus" } });

    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    // API should not be called for student verify
    expect(api.get).not.toHaveBeenCalledWith(
      expect.stringContaining("/users/students/verify"),
    );
  });

  it("shows error toast when student verification API fails", async () => {
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "123456",
      roomId: 12,
      setUserNickname: vi.fn(),
      setParticipantId: vi.fn(),
    } as unknown as ReturnType<typeof useRoom>);

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { status: "waiting" } })
      .mockRejectedValueOnce({
        response: { data: { detail: "Verificación fallida" } },
      });

    renderComponent();

    const input = screen.getByPlaceholderText("ABCD123");
    fireEvent.change(input, { target: { value: "abc1234" } });

    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/users/students/verify/abc1234");
    });
  });

  it("handles NewNickname modal callbacks (confirm and cancel)", async () => {
    const setUserNickname = vi.fn();
    const setParticipantId = vi.fn();
    vi.mocked(useRoom).mockReturnValue({
      roomCode: "123456",
      roomId: 12,
      setUserNickname,
      setParticipantId,
    } as unknown as ReturnType<typeof useRoom>);

    // Initial load then user verify doesn't exist
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { status: "live" } }) // test 'live' route
      .mockResolvedValueOnce({ data: { exists: false } });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/join"]}>
          <Routes>
            <Route path="/join" element={<NicknameEntry />} />
            <Route path="/live/12" element={<div>Live Room 12</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    const input = screen.getByPlaceholderText("ABCD123");
    fireEvent.change(input, { target: { value: "xyz9999" } });

    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await waitFor(() => {
      expect(screen.getByText("Estudiante no encontrado")).toBeInTheDocument();
    });

    // Test Cancel
    fireEvent.click(screen.getByRole("button", { name: "Modificar uvus" }));
    expect(
      screen.queryByText("Estudiante no encontrado"),
    ).not.toBeInTheDocument();

    // Re-open modal
    vi.mocked(api.get).mockResolvedValueOnce({ data: { exists: false } });
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await waitFor(() => {
      expect(screen.getByText("Estudiante no encontrado")).toBeInTheDocument();
    });

    // Mock API for NewNickname component creation
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { student_id: 10 } }) // create student
      .mockResolvedValueOnce({ data: { participant_id: 200 } }); // create participant

    // Trigger onConfirm by clicking 'Crear nuevo estudiante' inside modal
    fireEvent.click(
      screen.getByRole("button", { name: "Crear nuevo estudiante" }),
    );

    await waitFor(() => {
      expect(setUserNickname).toHaveBeenCalledWith("xyz9999");
      expect(setParticipantId).toHaveBeenCalledWith(200);
      expect(screen.getByText("Live Room 12")).toBeInTheDocument();
    });
  });
});
