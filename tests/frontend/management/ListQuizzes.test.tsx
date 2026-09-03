import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ListQuizzes from "@/management/ListQuizzes";
import api from "@/api";
import { RoomProvider } from "@/context/RoomContext";
import { ToastProvider } from "@/context/ToastContext";

vi.mock("@/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("ListQuizzes Component - Full Suite", () => {
  const mockQuizzes = [
    {
      id: 1,
      title: "Quiz 1",
      description: "Descripción 1",
      questions_count: 5,
      has_active_room: true,
      active_room_id: 100,
      active_room_code: "123456",
      active_room_status: "LIVE",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: "Quiz 2",
      description: "Descripción 2",
      questions_count: 10,
      has_active_room: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes("/rooms")) {
        return Promise.resolve({ data: [{ id: 10 }] });
      }
      return Promise.resolve({ data: mockQuizzes });
    });
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <RoomProvider>
          <MemoryRouter initialEntries={["/quizzes"]}>
            <Routes>
              <Route path="/quizzes" element={<ListQuizzes />} />
              <Route
                path="/quizzes/create"
                element={<div>Crear Quiz View</div>}
              />
            </Routes>
          </MemoryRouter>
        </RoomProvider>
      </ToastProvider>,
    );

  it("renders quiz list and filters tabs (Nuevos & Inactivos)", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Quiz 1")).toBeInTheDocument();
      expect(screen.getByText("Quiz 2")).toBeInTheDocument();
    });

    const newTab = screen.getByRole("button", { name: "Nuevos" });
    fireEvent.click(newTab);

    expect(screen.getByText("Quiz 1")).toBeInTheDocument();

    const inactiveTab = screen.getByRole("button", { name: "Inactivos" });
    fireEvent.click(inactiveTab);

    expect(screen.getByText("Quiz 2")).toBeInTheDocument();
    expect(screen.queryByText("Quiz 1")).not.toBeInTheDocument();
  });

  it("handles forcing finish on active room and opening room history", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Quiz 1")).toBeInTheDocument();
    });

    const forceFinishBtn = screen.getByRole("button", { name: "Finalizar" });
    fireEvent.click(forceFinishBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/stage/rooms/100/force-finish");
    });

    const viewHistoryBtns = screen.getAllByTitle("Ver");
    fireEvent.click(viewHistoryBtns[0]);
  });

  it("opens delete modal for quiz without active room and navigates to create quiz", async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Quiz 2")).toBeInTheDocument();
    });

    const quiz2Card = screen
      .getByText("Quiz 2")
      .closest(".quiz-horizontal-card")!;
    const deleteBtn = quiz2Card.querySelector('button[title="Eliminar"]')!;
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("¿Borrar cuestionario?")).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByText("Borrar cuestionario", {
      selector: "button",
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/content/quizzes/2");
    });

    const createQuizCard = screen.getByRole("button", {
      name: /Crear un nuevo cuestionario/i,
    });
    fireEvent.click(createQuizCard);

    expect(screen.getByText("Crear Quiz View")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    // Never resolves → stays in loading
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText("Cargando cuestionarios...")).toBeInTheDocument();
  });

  it("shows 'Inactivos' empty state when no inactive quizzes exist", async () => {
    // All quizzes have active rooms
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 1,
          title: "Quiz 1",
          active_room_status: "LIVE",
          created_at: new Date().toISOString(),
        },
      ],
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText("Quiz 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Inactivos" }));

    expect(
      screen.getByText("No hay cuestionarios inactivos"),
    ).toBeInTheDocument();
  });

  it("shows 'Nuevos' empty state when no recent quizzes exist", async () => {
    // Quiz older than 7 days
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [{ id: 1, title: "Quiz Viejo", created_at: oldDate.toISOString() }],
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.getByText("Quiz Viejo")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Nuevos" }));

    expect(screen.getByText("No hay cuestionarios nuevos")).toBeInTheDocument();
  });

  it("shows 'Todos' empty state when no quizzes exist", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("No tienes cuestionarios creados"),
      ).toBeInTheDocument();
    });
  });

  it("shows 'Verificando' status badge", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 3,
          title: "Quiz 3",
          active_room_status: "verifying",
          active_room_id: 300,
          created_at: new Date().toISOString(),
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Verificando")).toBeInTheDocument();
    });
  });

  it("shows 'En Lobby' status badge", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 4,
          title: "Quiz 4",
          active_room_status: "waiting",
          active_room_id: 400,
          created_at: new Date().toISOString(),
        },
      ],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("En Lobby")).toBeInTheDocument();
    });
  });

  it("reconnects to a waiting room via 'Reconectar' button", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 5,
          title: "Quiz 5",
          active_room_status: "waiting",
          active_room_id: 500,
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <ToastProvider>
        <RoomProvider>
          <MemoryRouter initialEntries={["/quizzes"]}>
            <Routes>
              <Route path="/quizzes" element={<ListQuizzes />} />
              <Route path="/lobby/:roomId" element={<div>Lobby View</div>} />
            </Routes>
          </MemoryRouter>
        </RoomProvider>
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByText("Quiz 5")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Reconectar" }));

    expect(screen.getByText("Lobby View")).toBeInTheDocument();
  });

  it("shows error toast when force-finish fails", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { detail: "Error al finalizar" } },
    });
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockQuizzes })
      .mockResolvedValueOnce({ data: mockQuizzes }); // after fetchQuizzes refetch

    renderComponent();

    await waitFor(() => expect(screen.getByText("Quiz 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/stage/rooms/100/force-finish");
    });
  });

  it("shows error toast when delete quiz fails", async () => {
    vi.mocked(api.delete).mockRejectedValueOnce({
      response: { data: { detail: "Error al borrar" } },
    });

    renderComponent();

    await waitFor(() => expect(screen.getByText("Quiz 2")).toBeInTheDocument());

    const quiz2Card = screen
      .getByText("Quiz 2")
      .closest(".quiz-horizontal-card")!;
    const deleteBtn = quiz2Card.querySelector('button[title="Eliminar"]')!;
    fireEvent.click(deleteBtn);

    await waitFor(() =>
      expect(screen.getByText("¿Borrar cuestionario?")).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByText("Borrar cuestionario", { selector: "button" }),
    );

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalled();
    });
  });

  it("cancels the delete modal when Cancelar is clicked", async () => {
    renderComponent();

    await waitFor(() => expect(screen.getByText("Quiz 2")).toBeInTheDocument());

    const quiz2Card = screen
      .getByText("Quiz 2")
      .closest(".quiz-horizontal-card")!;
    fireEvent.click(quiz2Card.querySelector('button[title="Eliminar"]')!);

    await waitFor(() =>
      expect(screen.getByText("¿Borrar cuestionario?")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("¿Borrar cuestionario?")).not.toBeInTheDocument();
  });

  it("cancels force finish when user declines confirm dialog", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    renderComponent();

    await waitFor(() => expect(screen.getByText("Quiz 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(api.post).not.toHaveBeenCalled();
  });
});
