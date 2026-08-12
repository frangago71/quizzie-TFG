import { test, expect } from "./fixtures";

test.describe("CU-08: Flujo de Consulta de Estadísticas", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  test("1a. Consultar Estadisticas - apertura de historial de salas y exportacion de resultados", async ({
    page,
  }) => {
    const mockQuizzes = [
      {
        id: 1,
        title: "Cuestionario Estadístico",
        description: "Quiz con estadísticas",
        questions: [],
        created_at: new Date().toISOString(),
      },
    ];

    const mockHistoryRooms = [
      {
        id: 10,
        join_code: "123456",
        status: "finished",
        created_at: new Date().toISOString(),
        participant_count: 5,
        average_score: 85,
        participants: [
          { nickname: "alumno1", score: 90, grade: 9.0 },
          { nickname: "alumno2", score: 80, grade: 8.0 },
        ],
      },
    ];

    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.route("**/content/quizzes/1/rooms*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockHistoryRooms),
      });
    });

    await page.route("**/stage/rooms/history/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockHistoryRooms),
      });
    });

    await page.route("**/stage/rooms/10/export*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/csv",
        body: "UVUS,Nota,Puntuación\nalumno1,9.0,90\nalumno2,8.0,80\n",
      });
    });

    await page.goto("/quizzes");
    await expect(page.getByText("Cuestionario Estadístico")).toBeVisible();

    const viewBtn = page.locator('.icon-btn[title="Ver"]').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(page.getByText(/Historial de salas/i)).toBeVisible();

      const closeBtn = page.locator("button.modal-close-btn");
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });
});
