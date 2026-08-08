import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AnsweringPhase from "../../room-play/AnsweringPhase";

describe("AnsweringPhase Component", () => {
  const mockRoomData = {
    id: 1,
    code: "123456",
    text: "¿Cuál es la capital de España?",
    time_limit: 30,
    options: [
      { id: 10, text: "Madrid", is_correct: true },
      { id: 11, text: "Barcelona", is_correct: false },
    ],
  };

  const defaultProps = {
    phase: "playing" as const,
    count: 0,
    roomCode: "123456",
    quizTitle: "Quiz Test",
    showAnswersCount: true,
    handleToggleAnswersVisibility: vi.fn(),
    answersCount: 5,
    isHost: false,
    timeLeft: 30,
    isPaused: false,
    answeringProgress: 50,
    handleShowResults: vi.fn(),
    roomData: mockRoomData as unknown as Record<string, unknown>,
    selectedOptionId: null,
    setSelectedOptionId: vi.fn(),
    isSent: false,
    handleSubmitAnswer: vi.fn(),
    handleStopTimer: vi.fn(),
  };

  it("disables send button when no option is selected", () => {
    render(<AnsweringPhase {...defaultProps} />);

    expect(
      screen.getByText("¿Cuál es la capital de España?"),
    ).toBeInTheDocument();
    const sendBtn = screen.getByRole("button", { name: /Enviar respuesta/i });
    expect(sendBtn).toBeDisabled();
  });

  it("allows student to select an option and submit answer", () => {
    const setSelectedOptionId = vi.fn();
    const handleSubmitAnswer = vi.fn();

    const { rerender } = render(
      <AnsweringPhase
        {...defaultProps}
        setSelectedOptionId={setSelectedOptionId}
        handleSubmitAnswer={handleSubmitAnswer}
      />,
    );

    const optionBtn = screen.getByText("Madrid");
    fireEvent.click(optionBtn);
    expect(setSelectedOptionId).toHaveBeenCalledWith(10);

    rerender(
      <AnsweringPhase
        {...defaultProps}
        selectedOptionId={10}
        setSelectedOptionId={setSelectedOptionId}
        handleSubmitAnswer={handleSubmitAnswer}
      />,
    );

    const sendBtn = screen.getByRole("button", { name: /Enviar respuesta/i });
    expect(sendBtn).not.toBeDisabled();
    fireEvent.click(sendBtn);
    expect(handleSubmitAnswer).toHaveBeenCalled();
  });

  it("renders host controls and countdown screen", () => {
    const handleStopTimer = vi.fn();
    const handleShowResults = vi.fn();

    const { rerender } = render(
      <AnsweringPhase {...defaultProps} phase="countdown" count={3} />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("¡Prepárate!")).toBeInTheDocument();

    rerender(
      <AnsweringPhase
        {...defaultProps}
        isHost={true}
        timeLeft={0}
        handleStopTimer={handleStopTimer}
        handleShowResults={handleShowResults}
      />,
    );

    const statsBtn = screen.getByRole("button", { name: /Ver estadísticas/i });
    fireEvent.click(statsBtn);
    expect(handleShowResults).toHaveBeenCalled();
  });

  it("renders sent state for student", () => {
    render(
      <AnsweringPhase {...defaultProps} selectedOptionId={10} isSent={true} />,
    );
    expect(screen.getByText("Respuesta enviada")).toBeInTheDocument();
    const sendBtn = screen.getByRole("button", { name: /Respuesta enviada/i });
    expect(sendBtn).toBeDisabled();
    expect(sendBtn).toHaveClass("is-sent");
  });

  it("renders student stats badge when showAnswersCount is true", () => {
    const { rerender } = render(
      <AnsweringPhase
        {...defaultProps}
        showAnswersCount={true}
        isHost={false}
        answersCount={42}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();

    rerender(
      <AnsweringPhase
        {...defaultProps}
        showAnswersCount={false}
        isHost={false}
        answersCount={42}
      />,
    );
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("renders paused state styling", () => {
    render(<AnsweringPhase {...defaultProps} isPaused={true} timeLeft={15} />);
    expect(screen.getByText("Pausa")).toBeInTheDocument();
  });

  it("renders host stats badge toggles", () => {
    const handleToggle = vi.fn();
    render(
      <AnsweringPhase
        {...defaultProps}
        isHost={true}
        showAnswersCount={false}
        handleToggleAnswersVisibility={handleToggle}
      />,
    );

    expect(screen.getByText("••")).toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", {
      name: /Mostrar contador a alumnos/i,
    });
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalled();
  });
});
