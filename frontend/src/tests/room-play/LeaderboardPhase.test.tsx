import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LeaderboardPhase from "../../room-play/LeaderboardPhase";

describe("LeaderboardPhase Component", () => {
  it("renders top 3 leaderboard data", () => {
    const data = [
      { name: "Líder 1", score: 1000 },
      { name: "Líder 2", score: 800 },
      { name: "Líder 3", score: 600 },
    ];

    render(<LeaderboardPhase data={data} />);

    expect(screen.getByText("Top 3")).toBeInTheDocument();
    expect(screen.getByText("Líder 1")).toBeInTheDocument();
    expect(screen.getByText(/1000/i)).toBeInTheDocument();
  });

  it("renders host action button and triggers callback", () => {
    const handleNext = vi.fn();

    render(
      <LeaderboardPhase
        data={[{ name: "Líder 1", score: 1000 }]}
        isHost={true}
        handleNextQuestion={handleNext}
        isLastQuestion={false}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: /Siguiente pregunta/i });
    fireEvent.click(nextBtn);

    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it("renders empty state when data length is 0", () => {
    render(<LeaderboardPhase data={[]} />);
    expect(screen.getByText("Clasificación")).toBeInTheDocument();
    expect(screen.getByText("Esperando puntuaciones...")).toBeInTheDocument();
    expect(
      screen.getByText("No hay participantes en la partida aún."),
    ).toBeInTheDocument();
  });

  it("renders correct title and subtitle for top 2", () => {
    const data = [
      { name: "Líder 1", score: 1000 },
      { name: "Líder 2", score: 800 },
    ];
    render(<LeaderboardPhase data={data} />);
    expect(screen.getByText("Top 2")).toBeInTheDocument();
    expect(
      screen.getByText("¡Enhorabuena a los líderes de la clasificación!"),
    ).toBeInTheDocument();
  });
});
