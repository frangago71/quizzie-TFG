import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ResultsPhase from "../../room-play/ResultsPhase";

describe("ResultsPhase Component", () => {
  const mockRoomData = {
    id: 1,
    text: "¿Cuál es la capital de España?",
    options: [
      { id: 10, text: "Madrid" },
      { id: 11, text: "Barcelona" },
    ],
    show_ranking: true,
    current_question_index: 1,
    total_questions: 5,
  };

  it("renders question text and chart columns", () => {
    const stats = { "10": 5, "11": 2 };

    render(
      <ResultsPhase
        roomData={mockRoomData as unknown as Record<string, unknown>}
        statistics={stats}
        correctOptionId={10}
        selectedOptionId={10}
        isHost={false}
        handleShowLeaderboard={vi.fn()}
      />,
    );

    expect(
      screen.getByText("¿Cuál es la capital de España?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Madrid")).toBeInTheDocument();
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
    expect(screen.getByText("¡Correcto!")).toBeInTheDocument();
  });

  it("renders host view and triggers leaderboard button", () => {
    const handleShowLeaderboard = vi.fn();

    render(
      <ResultsPhase
        roomData={mockRoomData as unknown as Record<string, unknown>}
        statistics={{ "10": 5 }}
        correctOptionId={10}
        selectedOptionId={null}
        isHost={true}
        handleShowLeaderboard={handleShowLeaderboard}
      />,
    );

    const rankingBtn = screen.getByRole("button", { name: /Ver Ranking/i });
    fireEvent.click(rankingBtn);

    expect(handleShowLeaderboard).toHaveBeenCalledTimes(1);
  });

  it("renders host view with tie and next question button", () => {
    const handleNext = vi.fn();
    const noRankingRoomData = { ...mockRoomData, show_ranking: false };

    render(
      <ResultsPhase
        roomData={noRankingRoomData as unknown as Record<string, unknown>}
        statistics={{ "10": 5, "11": 5 }} // Tie
        correctOptionId={10}
        selectedOptionId={null}
        isHost={true}
        handleShowLeaderboard={vi.fn()}
        handleNextQuestion={handleNext}
      />,
    );

    // Should show --- for tie
    expect(screen.getByText("---")).toBeInTheDocument();

    // Should show next question instead of leaderboard
    const nextBtn = screen.getByRole("button", { name: /Siguiente pregunta/i });
    fireEvent.click(nextBtn);
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it("renders student view when no option was selected", () => {
    render(
      <ResultsPhase
        roomData={mockRoomData as unknown as Record<string, unknown>}
        statistics={{ "10": 5 }}
        correctOptionId={10}
        selectedOptionId={null} // Sin voto
        isHost={false}
        handleShowLeaderboard={vi.fn()}
      />,
    );

    expect(screen.getByText("Sin voto")).toBeInTheDocument();
  });
});
