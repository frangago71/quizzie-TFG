import { test, expect } from "./fixtures";

test.describe("CU-09: Export Results Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Inyección de sesión de profesor autenticado
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  test("1a. Exportar resultados - flujo completo desde listado de cuestionarios, historial de salas y descarga CSV", async ({
    page,
  }) => {
    const mockQuizzes = [
      {
        id: 1,
        title: "Cuestionario de examen",
        description: "Evaluación final de programación",
        questions: [],
        created_at: new Date().toISOString(),
      },
    ];

    const mockHistoryRooms = [
      {
        id: 10,
        join_code: "123456",
        date: new Date().toISOString(),
        participants_count: 3,
      },
    ];

    const mockResults = [
      { name: "abc1234", score: 950, correct_answers: 5, total_questions: 5 },
      { name: "alumno2", score: 800, correct_answers: 4, total_questions: 5 },
      { name: "alumno3", score: 650, correct_answers: 3, total_questions: 5 },
    ];

    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.route("**/stage/quizzes/1/history*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockHistoryRooms),
      });
    });

    await page.route("**/stage/rooms/10/results*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResults),
      });
    });

    await page.goto("/quizzes");
    await expect(page.getByText("Cuestionario de Examen")).toBeVisible();

    // Abrir modal de historial de salas
    const viewBtn = page.locator('.icon-btn[title="Ver"]').first();
    await viewBtn.click();

    await expect(page.getByText(/Historial de salas/i)).toBeVisible();
    await expect(page.getByText(/3 alumnos/i)).toBeVisible();

    // Clic en ver resultados de la sala
    const seeResultsBtn = page.locator("button.history-item-btn");
    await seeResultsBtn.click();

    await expect(page.getByText(/Clasificación final/i)).toBeVisible();
    await expect(page.getByText("abc1234")).toBeVisible();

    // Descarga de archivo CSV
    const downloadPromise = page.waitForEvent("download");
    const downloadBtn = page.locator("button.btn-download-csv");
    await downloadBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("resultados_sala_123456");

    // Volver al historial de salas
    const backBtn = page.locator("button.btn-back-history");
    await backBtn.click();
    await expect(page.getByText(/Historial de salas/i)).toBeVisible();
  });

  test("2. Historial de sala - Manejo de estados de carga, lista vacia y errores de API", async ({
    page,
  }) => {
    const mockQuizzes = [
      {
        id: 1,
        title: "Cuestionario Vacio",
        description: "Sin salas",
        questions: [],
        created_at: new Date().toISOString(),
      },
    ];

    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    // Mock con error de servidor al cargar historial
    await page.route("**/stage/quizzes/1/history*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error cargando historial" }),
      });
    });

    await page.goto("/quizzes");
    const viewBtn = page.locator('.icon-btn[title="Ver"]').first();
    await viewBtn.click();

    await expect(
      page.getByText(/Error al cargar el historial de salas/i),
    ).toBeVisible();

    // Cambiar a respuesta vacía
    await page.route("**/stage/quizzes/1/history*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Cerrar y reabrir modal
    const closeBtn = page.locator("button.modal-close-btn");
    await closeBtn.click();
    await viewBtn.click();

    await expect(
      page.getByText(/No hay salas finalizadas con este cuestionario/i),
    ).toBeVisible();
  });
});
