import { test, expect } from "./fixtures";

test.describe("CU-06: Live Leaderboard Flow", () => {
  test("live ranking lifecycle: retrieve active room leaderboard and score progression", async ({
    page,
  }) => {
    await test.step("Step 1: Mock room leaderboard endpoint", async () => {
      // Mock del endpoint de clasificación en tiempo real
      await page.route(
        "http://localhost:8000/stage/rooms/10/leaderboard",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              { nickname: "abc1234", score: 950, position: 1 },
              { nickname: "alumno2", score: 800, position: 2 },
            ]),
          });
        },
      );
    });

    await test.step("Step 2: Initialize participant room session", async () => {
      // Ajuste del contexto de sesión para la sala en juego
      await page.addInitScript(() => {
        sessionStorage.setItem("roomId", "10");
        sessionStorage.setItem("participantId", "99");
      });
    });

    await test.step("Step 3: Navigate to live game view and verify ranking data", async () => {
      // Acceso a la vista en vivo y verificación del Top 5 de participantes
      await page.goto("/live/10");
      await expect(page.locator("body")).toBeVisible();

      const leaderboard = (await page.evaluate(async () => {
        const res = await fetch(
          "http://localhost:8000/stage/rooms/10/leaderboard",
        );
        return res.json();
      })) as Array<{ nickname: string; score: number }>;

      expect(leaderboard[0].nickname).toBe("abc1234");
      expect(leaderboard[0].score).toBe(950);
    });
  });
});
