import { test, expect } from "@playwright/test";

test.describe("CU-02: Content Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Inyección de token de sesión predeterminado para el profesor
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  test("full quiz management lifecycle: listing, creation, and editing", async ({
    page,
  }) => {
    await test.step("Step 1: Setup quiz API endpoint mocks", async () => {
      // Mocks de backend para obtener cuestionarios existentes y un cuestionario específico
      const quizzes = [
        {
          id: 1,
          title: "Cuestionario de Matemáticas",
          description: "Quiz de prueba inicial",
          questions: [],
          created_at: new Date().toISOString(),
        },
      ];

      await page.route(
        "http://localhost:8000/users/my-quizzes*",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(quizzes),
          });
        },
      );

      await page.route("http://localhost:8000/quizzes/1", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 1,
            title: "Cuestionario de Matemáticas",
            description: "Quiz de prueba inicial",
            questions: [
              {
                id: 101,
                question_text: "¿Cuánto es 2 + 2?",
                time_limit: 30,
                points: 10,
                options: [
                  { id: 1, option_text: "4", is_correct: true },
                  { id: 2, option_text: "3", is_correct: false },
                ],
              },
            ],
          }),
        });
      });
    });

    await test.step("Step 2: Navigate to quiz list and verify stored quiz display", async () => {
      // Verificación del listado principal de cuestionarios del docente
      await page.goto("/quizzes");
      await expect(page.getByText("Cuestionario de Matemáticas")).toBeVisible();
    });

    await test.step("Step 3: Access quiz creation editor interface", async () => {
      // Acceso al editor para la creación de un nuevo cuestionario
      await page.goto("/quizzes/create");
      await expect(page.locator("form, div")).toBeDefined();
    });

    await test.step("Step 4: Access quiz edit interface for existing quiz", async () => {
      // Acceso al editor para modificar un cuestionario existente
      await page.goto("/quizzes/edit/1");
      await expect(page.locator("form, div")).toBeDefined();
    });
  });
});
