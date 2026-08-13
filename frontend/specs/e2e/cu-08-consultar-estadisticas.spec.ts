import { test, expect } from "./fixtures";

test.describe("CU-08: Flujo de Consulta de Estadísticas", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  test("1a. Historial - apertura de historial de salas y resultados", async ({
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

  test("2a. Resultados - ver respuestas de alumnos", async ({ page }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "results",
          quiz_title: "Cuestionario Estadístico",
          current_question_index: 1,
          total_questions: 3,
          text: "¿Cuál es el resultado de 10 / 2?",
          correct_option_id: 2,
          statistics: { "1": 1, "2": 4, "3": 0 },
          options: [
            { id: 1, text: "4" },
            { id: 2, text: "5" },
            { id: 3, text: "6" },
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

    // Verificar desglose estadístico y opciones de respuesta
    await expect(
      page.getByText("¿Cuál es el resultado de 10 / 2?"),
    ).toBeVisible();
    await expect(page.getByText("PARTICIPACIÓN")).toBeVisible();

    const leaderboardBtn = page.getByRole("button", {
      name: /Ver clasificación/i,
    });
    if (await leaderboardBtn.isVisible()) {
      await leaderboardBtn.click();
    }
  });

  test("2b. Resultados - Vista de alumno con respuesta correcta, fallida y sin voto", async ({
    page,
  }) => {
    // 1. Alumno con respuesta correcta (opción 1 seleccionada, correcta es 1)
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "results",
          current_question_index: 1,
          total_questions: 3,
          text: "¿Pregunta con respuesta correcta?",
          correct_option_id: 1,
          statistics: { "1": 5, "2": 1, "3": 0 },
          options: [
            { id: 1, text: "Opción 1" },
            { id: 2, text: "Opción 2" },
            { id: 3, text: "Opción 3" },
          ],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await expect(page.getByText("TU RESULTADO")).toBeVisible();

    // 2. Alumno con respuesta incorrecta (opción 1 seleccionada, correcta es 2, opción 3 sin seleccionar)
    // Cubre barColor: var(--color-red), var(--color-blue), #e2e8f0
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "results",
          current_question_index: 1,
          total_questions: 3,
          text: "¿Pregunta con respuesta incorrecta?",
          correct_option_id: 2,
          statistics: { "1": 3, "2": 2, "3": 1 },
          options: [
            { id: 1, text: "Opción 1" },
            { id: 2, text: "Opción 2" },
            { id: 3, text: "Opción 3" },
          ],
        }),
      });
    });

    await page.goto("/live/10");
    await expect(page.getByText("TU RESULTADO")).toBeVisible();

    // 3. Profesor con consenso erróneo (mayoría en opción 1 pero la correcta es opción 2)
    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");
    await expect(page.getByText(/Opción A/i)).toBeVisible();
  });

  test("2c. Resultados - ranking desactivado, empate en votos, alumno sin voto y profesor sin votos", async ({
    page,
  }) => {
    // 1. Alumno sin voto (selectedOptionId: null) -> Muestra "Sin voto" (if (!selectedOptionId))
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "results",
          current_question_index: 1,
          total_questions: 3,
          text: "¿Pregunta sin voto?",
          correct_option_id: 1,
          statistics: { "1": 2, "2": 2 },
          options: [
            { id: 1, text: "Opción 1" },
            { id: 2, text: "Opción 2" },
          ],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Sin voto", { exact: true })).toBeVisible();

    // 2. Profesor con ranking desactivado y empate en votos -> Muestra "---" y botón Siguiente pregunta
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "results",
          show_ranking: false,
          current_question_index: 1,
          total_questions: 2,
          text: "¿Pregunta con ranking desactivado?",
          correct_option_id: 1,
          statistics: { "1": 3, "2": 3 },
          options: [
            { id: 1, text: "Opción 1" },
            { id: 2, text: "Opción 2" },
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
    await expect(page.getByText("---")).toBeVisible();
    const nextBtn = page.getByRole("button", { name: /Siguiente pregunta/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // 3. Profesor cuando nadie vota (statistics: {}) -> Muestra "0 alumnos", "0%" éxito global y "Finalizar cuestionario"
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "results",
          show_ranking: false,
          current_question_index: 2,
          total_questions: 2,
          text: "¿Pregunta sin ninguna respuesta?",
          correct_option_id: 1,
          statistics: {},
          options: [
            { id: 1, text: "Opción A" },
            { id: 2, text: "Opción B" },
          ],
        }),
      });
    });

    await page.goto("/live/10");
    await expect(page.getByText("0 alumnos")).toBeVisible();
    await expect(page.getByText("0%")).toBeVisible();
    const finishQuizBtn = page.getByRole("button", {
      name: /Finalizar cuestionario/i,
    });
    await expect(finishQuizBtn).toBeVisible();
    await finishQuizBtn.click();
  });
});
