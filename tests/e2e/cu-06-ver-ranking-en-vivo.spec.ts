import { test, expect } from "./fixtures";

test.describe("CU-06: Ver Ranking en Vivo", () => {
  test("1a. Ranking - ver la clasificación en vivo y el podio del Top 3", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "leaderboard",
          quiz_title: "Cuestionario de Prueba",
          current_question_index: 1,
          total_questions: 3,
          leaderboard: [
            { name: "abc1234", score: 950 },
            { name: "alumno2", score: 800 },
            { name: "alumno3", score: 650 },
          ],
        }),
      });
    });

    await page.route("**/stage/rooms/10/next-question", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");

    // Verificar títulos del podio y clasificados
    await expect(page.getByText("Top 3")).toBeVisible();
    await expect(page.getByText("abc1234")).toBeVisible();
    await expect(page.getByText("950 puntos")).toBeVisible();
    await expect(page.getByText("alumno2")).toBeVisible();
    await expect(page.getByText("alumno3")).toBeVisible();

    // Botón de siguiente pregunta para el profesor
    const nextBtn = page.getByRole("button", { name: /Siguiente pregunta/i });
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
    }
  });

  test("1b. Ranking - muestra mensaje cuando no hay participantes en el podio", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "leaderboard",
          leaderboard: [],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");

    await expect(page.getByText("Clasificación")).toBeVisible();
    await expect(
      page.getByText("No hay participantes en la partida aún."),
    ).toBeVisible();
  });

  test("1c. Ranking - alumno ve en qué posición del ranking se encuentra", async ({
    page,
  }) => {
    // 1. Podio para 2 participantes
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "leaderboard",
          current_question_index: 3,
          total_questions: 3,
          leaderboard: [
            { name: "abc1234", score: 950 },
            { name: "alumno2", score: 800 },
          ],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Top 2")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Finalizar cuestionario/i }),
    ).toBeVisible();

    // 2. Podio para 1 participante (Líder)
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "leaderboard",
          current_question_index: 1,
          total_questions: 3,
          leaderboard: [{ name: "abc1234", score: 950 }],
        }),
      });
    });

    await page.goto("/live/10");
    await expect(page.locator("h1.podium-main-title")).toHaveText("Líder");
  });
});
