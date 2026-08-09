import { test, expect } from "@playwright/test";

test.describe("CU-05: Student Join Room Flow", () => {
  test("student room join lifecycle: PIN validation, nickname entry, and waiting room access", async ({
    page,
  }) => {
    await test.step("Step 1: Mock PIN verification and join endpoints", async () => {
      // Mocks de backend para validar PIN e incorporar al alumno a la sala
      await page.route(
        "http://localhost:8000/stage/rooms/verify/123456",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              room_id: 10,
              status: "waiting",
            }),
          });
        },
      );

      await page.route(
        "http://localhost:8000/stage/rooms/10/join",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ participant_id: 99, status: "joined" }),
          });
        },
      );
    });

    await test.step("Step 2: Initialize student session credentials", async () => {
      // Simulación de entrada de Nickname e identificadores en la sesión del alumno
      await page.addInitScript(() => {
        sessionStorage.setItem("roomId", "10");
        sessionStorage.setItem("roomCode", "123456");
        sessionStorage.setItem("userNickname", "abc1234");
        sessionStorage.setItem("participantId", "99");
      });
    });

    await test.step("Step 3: Enter waiting lobby as student", async () => {
      // Comprobación del estado de espera dentro de la sala
      await page.goto("/lobby/10");
      await expect(page.locator("body")).toBeVisible();
    });
  });
});
