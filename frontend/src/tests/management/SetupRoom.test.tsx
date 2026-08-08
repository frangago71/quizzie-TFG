import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SetupRoom from "../../management/SetupRoom";
import api from "../../api";
import { RoomProvider } from "../../context/RoomContext";
import { ToastProvider } from "../../context/ToastContext";
import ToastContainer from "../../layouts/ToastContainer";

vi.mock("../../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("SetupRoom Component", () => {
  const mockQuiz = {
    id: 1,
    title: "Quiz para Configurar",
    description: "Descripción del quiz",
    created_at: "2026-08-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <ToastContainer />
        <RoomProvider>
          <MemoryRouter initialEntries={["/quizzes/1/setup"]}>
            <Routes>
              <Route path="/quizzes/:id/setup" element={<SetupRoom />} />
              <Route path="/live/:roomId" element={<div>Live Room View</div>} />
            </Routes>
          </MemoryRouter>
        </RoomProvider>
      </ToastProvider>,
    );

  it("fetches quiz details and renders settings controls", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument();
      expect(screen.getByText("Descripción del quiz")).toBeInTheDocument();
    });
  });

  it("toggles options via click and keyboard (Enter / Space)", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { id: 100, join_code: "654321" },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument();
    });

    const shuffleQuestionsBtn = screen.getByLabelText(
      "Alternar preguntas aleatorias",
    );
    const shuffleOptionsBtn = screen.getByLabelText(
      "Alternar opciones aleatorias",
    );
    const showRankingBtn = screen.getByLabelText(
      "Alternar mostrar ranking tras cada pregunta",
    );

    fireEvent.keyDown(shuffleQuestionsBtn, { key: "Enter" });
    fireEvent.keyDown(shuffleOptionsBtn, { key: " " });
    fireEvent.keyDown(showRankingBtn, { key: "Enter" });

    const launchBtn = screen.getByRole("button", { name: /Crear sala/i });
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/stage/rooms",
        null,
        expect.objectContaining({
          params: expect.objectContaining({ quiz_id: "1" }),
        }),
      );
      expect(screen.getByText("Live Room View")).toBeInTheDocument();
    });
  });

  it("handles room creation errors (400, 404)", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 400, data: { detail: "Ya tienes una sala activa" } },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument();
    });

    const launchBtn = screen.getByRole("button", { name: /Crear sala/i });
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.getByText("Ya tienes una sala activa")).toBeInTheDocument();
    });
  });

  it("shows 404 error message when quiz is not found", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });
    vi.mocked(api.post).mockRejectedValueOnce({
      response: {
        status: 404,
        data: { detail: "El cuestionario seleccionado no existe." },
      },
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Crear sala/i }));

    await waitFor(() => {
      expect(
        screen.getByText("El cuestionario seleccionado no existe."),
      ).toBeInTheDocument();
    });
  });

  it("shows generic error message on unknown status", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 500, data: { detail: "Error inesperado" } },
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Crear sala/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error 500/)).toBeInTheDocument();
    });
  });

  it("shows no-server-response error when error has no response", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Network Error"));

    renderComponent();

    await waitFor(() =>
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Crear sala/i }));

    await waitFor(() => {
      expect(
        screen.getByText("No hay respuesta del servidor."),
      ).toBeInTheDocument();
    });
  });

  it("renders time adjuster buttons and adjusts answer time", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });

    renderComponent();

    await waitFor(() =>
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument(),
    );

    const decreaseBtn = screen.getByRole("button", {
      name: "Disminuir tiempo",
    });
    const increaseBtn = screen.getByRole("button", { name: "Aumentar tiempo" });

    expect(screen.getByText("45s")).toBeInTheDocument();

    fireEvent.click(increaseBtn); // 50s
    expect(screen.getByText("50s")).toBeInTheDocument();

    fireEvent.click(decreaseBtn); // 45s
    expect(screen.getByText("45s")).toBeInTheDocument();
  });

  it("renders quiz with tags", async () => {
    const quizWithTags = { ...mockQuiz, tags: "Historia, Ciencia, Arte" };
    vi.mocked(api.get).mockResolvedValueOnce({ data: quizWithTags });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Historia")).toBeInTheDocument();
    });
  });

  it("shows lobby view when room status is waiting", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockQuiz });
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { id: 200, join_code: "WAIT01", status: "waiting" },
    });

    render(
      <ToastProvider>
        <ToastContainer />
        <RoomProvider>
          <MemoryRouter initialEntries={["/quizzes/1/setup"]}>
            <Routes>
              <Route path="/quizzes/:id/setup" element={<SetupRoom />} />
              <Route path="/lobby/:roomId" element={<div>Lobby View</div>} />
            </Routes>
          </MemoryRouter>
        </RoomProvider>
      </ToastProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Quiz para Configurar")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Crear sala/i }));

    await waitFor(() => {
      expect(screen.getByText("Lobby View")).toBeInTheDocument();
    });
  });
});
