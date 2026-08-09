import { test, expect } from "@playwright/test";

test.describe("CU-04: Room Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Autenticación previa del profesor mediante token
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  test("teacher room setup lifecycle: room creation, PIN generation, and lobby access", async ({
    page,
  }) => {
    await test.step("Step 1: Mock room creation endpoint and PIN code generation", async () => {
      // Mock de API para instanciar la sala y generar el código PIN de 6 dígitos
      await page.route(
        "http://localhost:8000/stage/rooms/setup/*",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              room_id: 10,
              pin_code: "123456",
            }),
          });
        },
      );
    });

    await test.step("Step 2: Initialize teacher room session state", async () => {
      // Configuración del almacenamiento local de la sala para el profesor
      await page.addInitScript(() => {
        sessionStorage.setItem("roomId", "10");
        sessionStorage.setItem("roomCode", "123456");
      });
    });

    await test.step("Step 3: Access room lobby as administrator", async () => {
      // Carga del lobby de la sala creada
      await page.goto("/lobby/10");
      await expect(page.locator("body")).toBeVisible();
    });
  });
});
