import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RoomHistoryModal from "../../management/RoomHistoryModal";
import api from "../../api";

vi.mock("../../api", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("RoomHistoryModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <RoomHistoryModal
        isOpen={false}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("fetches and renders past rooms", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [
        {
          id: 10,
          join_code: "123456",
          date: "2026-08-01T10:00:00Z",
          participants_count: 5,
        },
      ],
    });

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    expect(screen.getByText("Cargando historial...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Historial de salas")).toBeInTheDocument();
      expect(screen.getByText("Test Quiz")).toBeInTheDocument();
      expect(screen.getByText("5 alumnos")).toBeInTheDocument();
    });
  });

  it("navigates to room results view on button click", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            join_code: "123456",
            date: "2026-08-01T10:00:00Z",
            participants_count: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            name: "Alumno 1",
            score: 100,
            correct_answers: 2,
            total_questions: 2,
          },
        ],
      });

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Ver resultados")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Ver resultados"));

    await waitFor(() => {
      expect(screen.getByText("Clasificación final")).toBeInTheDocument();
      expect(screen.getByText("Alumno 1")).toBeInTheDocument();
      expect(screen.getByText("100 pts")).toBeInTheDocument();
    });
  });

  it("shows error state when history fetch fails", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network Error"));

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Error al cargar el historial de salas."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no past rooms exist", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("No hay salas finalizadas con este cuestionario."),
      ).toBeInTheDocument();
    });
  });

  it("shows error state when results fetch fails", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            join_code: "ABC",
            date: "2026-08-01T10:00:00Z",
            participants_count: 1,
          },
        ],
      })
      .mockRejectedValueOnce(new Error("Network Error"));

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Ver resultados")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Ver resultados"));

    await waitFor(() => {
      expect(
        screen.getByText("Error al cargar los resultados de la sala."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty results state when no students were verified", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            join_code: "ABC",
            date: "2026-08-01T10:00:00Z",
            participants_count: 1,
          },
        ],
      })
      .mockResolvedValueOnce({ data: [] });

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => fireEvent.click(screen.getByText("Ver resultados")));

    await waitFor(() => {
      expect(
        screen.getByText(
          "No se registraron alumnos verificados en esta sesión.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("downloads CSV when button is clicked", async () => {
    // Mock URL.createObjectURL and revokeObjectURL
    const mockUrl = "blob:mock";
    const createObjectURL = vi.fn().mockReturnValue(mockUrl);
    globalThis.URL.createObjectURL = createObjectURL;
    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");
    const clickSpy = vi.fn();

    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            join_code: "ABC123",
            date: "2026-08-01T10:00:00Z",
            participants_count: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { name: "Alumno", score: 80, correct_answers: 4, total_questions: 5 },
        ],
      });

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => fireEvent.click(screen.getByText("Ver resultados")));
    await waitFor(() =>
      expect(screen.getByText("Clasificación final")).toBeInTheDocument(),
    );

    // Intercept the dynamically created link's click
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === "a") {
        Object.defineProperty(el, "click", { value: clickSpy });
      }
      return el;
    });

    fireEvent.click(screen.getByRole("button", { name: "Descargar CSV" }));

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("closes modal when overlay is clicked or Escape pressed", async () => {
    const onClose = vi.fn();
    vi.mocked(api.get).mockResolvedValueOnce({ data: [] });

    const { container } = render(
      <RoomHistoryModal
        isOpen={true}
        onClose={onClose}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => screen.getByText("Historial de salas"));

    const overlay = container.querySelector(".modal-overlay")!;
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("navigates back to history view from results", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            join_code: "ABC",
            date: "2026-08-01T10:00:00Z",
            participants_count: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            name: "Alumno 1",
            score: 100,
            correct_answers: 2,
            total_questions: 2,
          },
        ],
      });

    render(
      <RoomHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        quizId={1}
        quizTitle="Test Quiz"
      />,
    );

    await waitFor(() => fireEvent.click(screen.getByText("Ver resultados")));
    await waitFor(() =>
      expect(screen.getByText("Clasificación final")).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Volver al historial" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Historial de salas")).toBeInTheDocument();
    });
  });
});
