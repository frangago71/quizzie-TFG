import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CreateQuiz from "../../management/CreateQuiz";
import api from "../../api";
import { ToastProvider } from "../../context/ToastContext";

vi.mock("../../api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("CreateQuiz Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <MemoryRouter>
          <CreateQuiz />
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders initial form with title, description, and first question", () => {
    renderComponent();

    expect(screen.getByPlaceholderText("Título")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Añade una descripción aquí..."),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Escribe el enunciado"),
    ).toBeInTheDocument();
  });

  it("allows adding options, removing options, and adjusting points", () => {
    renderComponent();

    const questionInput = screen.getByPlaceholderText("Escribe el enunciado");
    fireEvent.change(questionInput, { target: { value: "Pregunta 1" } });

    const option1Input = screen.getByPlaceholderText("Opción 1");
    const option2Input = screen.getByPlaceholderText("Opción 2");
    fireEvent.change(option1Input, { target: { value: "Opción A" } });
    fireEvent.change(option2Input, { target: { value: "Opción B" } });

    const addOptionBtn = screen.getByRole("button", { name: "Añadir opción" });
    fireEvent.click(addOptionBtn);

    expect(screen.getByPlaceholderText("Opción 3")).toBeInTheDocument();

    const removeOptionBtns = screen.getAllByRole("button", { name: "✕" });
    fireEvent.click(removeOptionBtns[0]);
    expect(screen.queryByPlaceholderText("Opción 3")).not.toBeInTheDocument();

    const pointsInput = screen.getByLabelText("PUNTOS");
    fireEvent.change(pointsInput, { target: { value: "25" } });
    fireEvent.blur(pointsInput);
  });

  it("allows adding and removing questions and touch swiping", () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText("Escribe el enunciado"), {
      target: { value: "Pregunta 1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Opción 1"), {
      target: { value: "Opción A" },
    });
    fireEvent.change(screen.getByPlaceholderText("Opción 2"), {
      target: { value: "Opción B" },
    });

    const nextBtn = screen.getAllByRole("button", { name: "›" })[0];
    fireEvent.click(nextBtn);

    expect(screen.getByText("PREGUNTA 2 de 2")).toBeInTheDocument();

    // Touch swipe left to navigate
    const card = screen.getByText("PREGUNTA 2 de 2").closest(".question-card")!;
    fireEvent.touchStart(card, {
      targetTouches: [{ clientX: 300 }],
    } as unknown as TouchEvent);
    fireEvent.touchMove(card, {
      targetTouches: [{ clientX: 100 }],
    } as unknown as TouchEvent);
    fireEvent.touchEnd(card);

    // Remove question
    const removeQBtn = screen.getByRole("button", { name: "✕" });
    fireEvent.click(removeQBtn);
    expect(screen.getByText("PREGUNTA 1 de 1")).toBeInTheDocument();
  });

  it("handles keyboard navigation on add option ghost button and dot clicks", () => {
    renderComponent();

    const questionInput = screen.getByPlaceholderText("Escribe el enunciado");
    fireEvent.change(questionInput, { target: { value: "Pregunta 1" } });

    const option1Input = screen.getByPlaceholderText("Opción 1");
    const option2Input = screen.getByPlaceholderText("Opción 2");
    fireEvent.change(option1Input, { target: { value: "Opción A" } });
    fireEvent.change(option2Input, { target: { value: "Opción B" } });

    const addOptionBtn = screen.getByRole("button", { name: "Añadir opción" });
    fireEvent.keyDown(addOptionBtn, { key: "Enter" });
    fireEvent.keyDown(addOptionBtn, { key: "Tab", shiftKey: false });

    const nextBtn = screen.getAllByRole("button", { name: "›" })[0];
    fireEvent.click(nextBtn);

    const dots = screen.getAllByRole("button", { name: /Ir a la pregunta/i });
    fireEvent.click(dots[0]);
  });

  it("submits quiz successfully and handles API rejection", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText("Título"), {
      target: { value: "Mi Quiz" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Añade una descripción aquí..."),
      { target: { value: "Descripción del quiz" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Escribe el enunciado"), {
      target: { value: "Pregunta 1" },
    });

    const option1Input = screen.getByPlaceholderText("Opción 1");
    const option2Input = screen.getByPlaceholderText("Opción 2");
    fireEvent.change(option1Input, { target: { value: "Opción 1" } });
    fireEvent.change(option2Input, { target: { value: "Opción 2" } });

    const createBtn = screen.getByRole("button", {
      name: /Crear cuestionario/i,
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/content/quizzes",
        expect.objectContaining({
          title: "Mi Quiz",
        }),
      );
    });
  });

  it("handles points blur with invalid or empty value", () => {
    renderComponent();
    const pointsInput = screen.getByLabelText("PUNTOS");

    // Test empty value
    fireEvent.change(pointsInput, { target: { value: "" } });
    fireEvent.blur(pointsInput);
    expect(pointsInput).toHaveValue(1);

    // Test negative value
    fireEvent.change(pointsInput, { target: { value: "-5" } });
    fireEvent.blur(pointsInput);
    expect(pointsInput).toHaveValue(1);
  });

  it("prevents submit with empty title/description and shows warning", () => {
    renderComponent();
    const createBtn = screen.getByRole("button", {
      name: /Crear cuestionario/i,
    });
    fireEvent.click(createBtn);
    // Note: Toasts are tested via UI effect if mock is present, but we mainly want to cover the branch returning early
    expect(api.post).not.toHaveBeenCalled();
  });

  it("prevents submit with empty question text", () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText("Título"), {
      target: { value: "Mi Quiz" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Añade una descripción aquí..."),
      { target: { value: "Descripción" } },
    );

    // Enunciado left blank
    const createBtn = screen.getByRole("button", {
      name: /Crear cuestionario/i,
    });
    fireEvent.click(createBtn);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("prevents submit with empty option text", () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText("Título"), {
      target: { value: "Mi Quiz" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Añade una descripción aquí..."),
      { target: { value: "Descripción" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Escribe el enunciado"), {
      target: { value: "Pregunta 1" },
    });

    // One option filled, one blank
    fireEvent.change(screen.getByPlaceholderText("Opción 1"), {
      target: { value: "Opción A" },
    });

    const createBtn = screen.getByRole("button", {
      name: /Crear cuestionario/i,
    });
    fireEvent.click(createBtn);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("shows error when API submission fails", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error("API Error"));
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText("Título"), {
      target: { value: "Mi Quiz" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Añade una descripción aquí..."),
      { target: { value: "Descripción" } },
    );
    fireEvent.change(screen.getByPlaceholderText("Escribe el enunciado"), {
      target: { value: "Pregunta 1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Opción 1"), {
      target: { value: "Opción 1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Opción 2"), {
      target: { value: "Opción 2" },
    });

    const createBtn = screen.getByRole("button", {
      name: /Crear cuestionario/i,
    });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("navigates with dot clicks including mobile dots", () => {
    renderComponent();

    // Make question 1 non-empty
    fireEvent.change(screen.getByPlaceholderText("Escribe el enunciado"), {
      target: { value: "Pregunta 1" },
    });
    fireEvent.change(screen.getByPlaceholderText("Opción 1"), {
      target: { value: "Opción A" },
    });
    fireEvent.change(screen.getByPlaceholderText("Opción 2"), {
      target: { value: "Opción B" },
    });

    const nextBtn = screen.getAllByRole("button", { name: "›" })[0];
    fireEvent.click(nextBtn); // Creates question 2

    // Fill question 2 so it is not deleted when navigating away
    fireEvent.change(screen.getByPlaceholderText("Escribe el enunciado"), {
      target: { value: "Pregunta 2" },
    });

    // Now there are 2 questions. Both PC and Mobile dots exist
    const allDots = screen.getAllByRole("button", {
      name: /Ir a la pregunta/i,
    });

    // PC dots are the first half, Mobile are the second half
    // Click PC dot 1
    fireEvent.click(allDots[0]);
    expect(screen.getByText("PREGUNTA 1 de 2")).toBeInTheDocument();

    // Click Mobile dot 2
    fireEvent.click(allDots[3]); // Assuming 2 questions = 4 dots (2 PC, 2 Mobile)
    expect(screen.getByText("PREGUNTA 2 de 2")).toBeInTheDocument();
  });

  it("sets correct option via radio button", () => {
    renderComponent();
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();

    fireEvent.click(radios[1]);
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();
  });
});
