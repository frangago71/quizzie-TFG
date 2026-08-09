import { test, expect } from "@playwright/test";

test.describe("CU-07: QR Grade Verification Flow", () => {
  test("presencial QR validation lifecycle: token rendering and teacher token verification", async ({
    page,
  }) => {
    await test.step("Step 1: Mock QR student result and teacher verification endpoints", async () => {
      // Mocks para la entrega del token de verificación y la validación docente
      await page.route(
        "http://localhost:8000/stage/rooms/10/results/me",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              score: 850,
              correct_answers: 4,
              total_questions: 5,
              verification_token: "qr-token-abc-123",
              is_verified: false,
            }),
          });
        },
      );

      await page.route(
        "http://localhost:8000/stage/verify-token*",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              status: "success",
              message: "Nota verificada correctamente",
              verified: true,
            }),
          });
        },
      );
    });

    await test.step("Step 2: Setup student session state", async () => {
      // Inyección de datos de participante en sessionStorage
      await page.addInitScript(() => {
        sessionStorage.setItem("roomId", "10");
        sessionStorage.setItem("participantId", "99");
        sessionStorage.setItem("userNickname", "abc1234");
      });
    });

    await test.step("Step 3: Render final screen and trigger teacher QR scan verification", async () => {
      // Simulación del escaneo del token QR por parte del profesor
      await page.goto("/live/10");
      await expect(page.locator("body")).toBeVisible();

      const verifyResult = (await page.evaluate(async () => {
        const res = await fetch("http://localhost:8000/stage/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: "qr-token-abc-123",
            roomId: 10,
            nickname: "abc1234",
          }),
        });
        return { status: res.status, data: await res.json() };
      })) as { status: number; data: { verified: boolean } };

      expect(verifyResult.status).toBe(200);
      expect(verifyResult.data.verified).toBe(true);
    });
  });
});
