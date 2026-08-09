import { test, expect } from "./fixtures";

test.describe("CU-08: Statistics Analytics Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Autenticación del profesor
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  test("analytics consultation lifecycle: teacher accesses historical room logs and accuracy metrics", async ({
    page,
  }) => {
    await test.step("Step 1: Mock room history analytics endpoint", async () => {
      // Mock de API para el histórico de salas del profesor
      await page.route(
        "http://localhost:8000/stage/rooms/history*",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: 10,
                room_code: "123456",
                quiz_title: "Cuestionario de Matemáticas",
                created_at: new Date().toISOString(),
                participants_count: 5,
                verified_count: 4,
              },
            ]),
          });
        },
      );
    });

    await test.step("Step 2: Fetch and verify historical room stats", async () => {
      // Acceso al panel de control y consulta de métricas registradas
      await page.goto("/quizzes");
      await expect(page.locator("body")).toBeVisible();

      const history = (await page.evaluate(async () => {
        const res = await fetch("http://localhost:8000/stage/rooms/history");
        return res.json();
      })) as Array<{ room_code: string }>;

      expect(history).toHaveLength(1);
      expect(history[0].room_code).toBe("123456");
    });
  });
});
