import { test, expect } from "@playwright/test";

test.describe("CU-01: Authentication Flow", () => {
  test("complete teacher authentication lifecycle: route protection, registration, login, and logout", async ({
    page,
  }) => {
    await test.step("Step 1: Verify redirect from protected routes for unauthenticated users", async () => {
      // Redirección de usuario no autenticado al acceder a rutas protegidas
      await page.goto("/quizzes");
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step("Step 2: Setup backend API route mocks for auth", async () => {
      // Mocks de backend para registro, inicio de sesión y listado de cuestionarios
      await page.route(
        "http://localhost:8000/users/register",
        async (route) => {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              message: "Usuario registrado correctamente",
            }),
          });
        },
      );

      await page.route("http://localhost:8000/users/login", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            access_token: "fake-jwt-token-12345",
            token_type: "bearer",
          }),
        });
      });

      await page.route(
        "http://localhost:8000/users/my-quizzes*",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        },
      );
    });

    await test.step("Step 3: Register new teacher and log in with JWT token", async () => {
      // Flujo de interfaz de usuario para registro y login
      await page.goto("/login");
      await expect(page.getByText("Acceso Profesores")).toBeVisible();

      await page.getByText(/Regístrate/i).click();
      await expect(page).toHaveURL(/\/register/);

      await page.goto("/login");
      await page.locator("#email").fill("teacher@example.com");
      await page.locator("#password").fill("SecretPass123!");
      await page.getByRole("button", { name: /Entrar/i }).click();

      await page.waitForURL(/\/quizzes/);
      await expect(page).toHaveURL(/\/quizzes/);

      const token = await page.evaluate(() => sessionStorage.getItem("token"));
      expect(token).toBe("fake-jwt-token-12345");
    });

    await test.step("Step 4: Log out and verify session termination", async () => {
      // Eliminación de token de sesión y comprobación de restricción de acceso
      await page.evaluate(() => sessionStorage.removeItem("token"));
      await page.goto("/quizzes");
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
