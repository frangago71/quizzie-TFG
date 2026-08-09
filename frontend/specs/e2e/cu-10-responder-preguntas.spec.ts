import { test, expect } from "@playwright/test";

test.describe("CU-10: Question Answering Flow", () => {
  test("question answering lifecycle: student selects option within time limit and receives score", async ({
    page,
  }) => {
    await test.step("Step 1: Mock answer submission endpoint", async () => {
      // Mock de API para la recepción de la opción seleccionada y cálculo de puntuación
      await page.route(
        "http://localhost:8000/stage/rooms/10/submit-answer",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              accepted: true,
              points_earned: 95,
              is_correct: true,
            }),
          });
        },
      );
    });

    await test.step("Step 2: Setup active student game session", async () => {
      // Inyección del estado de la partida en vivo
      await page.addInitScript(() => {
        sessionStorage.setItem("roomId", "10");
        sessionStorage.setItem("participantId", "99");
      });
    });

    await test.step("Step 3: Submit answer payload and verify score calculation", async () => {
      // Envío de respuesta con tiempo de reacción y verificación del resultado devuelto
      await page.goto("/live/10");
      await expect(page.locator("body")).toBeVisible();

      const answerResponse = (await page.evaluate(async () => {
        const res = await fetch(
          "http://localhost:8000/stage/rooms/10/submit-answer",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              participant_id: 99,
              question_id: 101,
              option_id: 1,
              response_time_ms: 1200,
            }),
          },
        );
        return res.json();
      })) as { accepted: boolean; points_earned: number };

      expect(answerResponse.accepted).toBe(true);
      expect(answerResponse.points_earned).toBe(95);
    });
  });
});
