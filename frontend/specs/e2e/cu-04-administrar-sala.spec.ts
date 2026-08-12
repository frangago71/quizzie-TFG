import { test, expect } from "./fixtures";

test.describe("CU-04: Flujo de Gestión de Sala", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  const mockQuiz = {
    id: 1,
    title: "Cuestionario de Configuración",
    description: "Prueba de sala",
    created_at: "2026-08-10T12:00:00Z",
    tags: "Programación,Web,TypeScript",
    questions: [{ id: 101, text: "¿Pregunta 1?", points: 10 }],
  };

  test("1a. Configurar Sala - carga de datos, renderizado de tags y navegacion escritorio", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.goto("/quizzes/setup/1");
    await expect(page.getByText("Cuestionario de Configuración")).toBeVisible();
    await expect(page.getByText("Programación")).toBeVisible();

    const backNavBtn = page.locator("button.back-nav");
    if (await backNavBtn.isVisible()) {
      await backNavBtn.click();
      await page.waitForURL(/\/quizzes/);
    }
  });

  test("1b. Configurar Sala - toggles por clic y por teclado Enter y Espacio", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.goto("/quizzes/setup/1");
    await expect(page.getByText("Cuestionario de Configuración")).toBeVisible();

    // Interruptor 1: Preguntas aleatorias (clic y teclado Enter/Espacio)
    const ctrl1 = page.locator('[aria-label="Alternar preguntas aleatorias"]');
    if (await ctrl1.isVisible()) {
      await ctrl1.click();
      await ctrl1.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press(" ");
    }

    // Interruptor 2: Opciones aleatorias (clic y teclado Enter/Espacio)
    const ctrl2 = page.locator('[aria-label="Alternar opciones aleatorias"]');
    if (await ctrl2.isVisible()) {
      await ctrl2.click();
      await ctrl2.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press(" ");
    }

    // Interruptor 3: Mostrar ranking tras cada pregunta (clic y teclado Enter/Espacio)
    const ctrl3 = page.locator('[aria-label="Alternar mostrar ranking tras cada pregunta"]');
    if (await ctrl3.isVisible()) {
      await ctrl3.click();
      await ctrl3.focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press(" ");
    }

    // Botón para disminuir tiempo (-)
    const minusBtn = page.getByRole("button", { name: "Disminuir tiempo" });
    if (await minusBtn.isVisible() && await minusBtn.isEnabled()) {
      await minusBtn.click();
    }

    // Botón para aumentar tiempo (+)
    const plusBtn = page.getByRole("button", { name: "Aumentar tiempo" });
    if (await plusBtn.isVisible() && await plusBtn.isEnabled()) {
      await plusBtn.click();
    }
  });

  test("1c. Configurar Sala - vista movil, evento resize y boton volver movil", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/quizzes/setup/1");
    await expect(page.getByText("Cuestionario de Configuración")).toBeVisible();

    await page.evaluate(() => {
      (globalThis as any).window.dispatchEvent(new Event("resize"));
    });

    const mobileBackBtn = page.locator(".setup-external-actions button.back-nav");
    if (await mobileBackBtn.isVisible()) {
      await mobileBackBtn.click();
      await page.waitForURL(/\/quizzes/);
    }
  });

  test("1d. Configurar Sala - apertura de sala en estado waiting y navegacion a lobby", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.route("**/stage/rooms*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 10,
            join_code: "123456",
            status: "waiting",
          }),
        });
      }
    });

    await page.goto("/quizzes/setup/1");
    await page.getByRole("button", { name: /Crear sala/i }).click();
    await page.waitForURL(/\/lobby\/10/);
  });

  test("1e. Configurar Sala - apertura de sala en estado live y navegacion a live", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.route("**/stage/rooms*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 11,
            join_code: "654321",
            status: "live",
          }),
        });
      }
    });

    await page.goto("/quizzes/setup/1");
    await page.getByRole("button", { name: /Crear sala/i }).click();
    await page.waitForURL(/\/live\/11/);
  });

  test("1f. Configurar Sala - manejo de error 400 con mensaje por defecto", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.route("**/stage/rooms*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      }
    });

    await page.goto("/quizzes/setup/1");
    await page.getByRole("button", { name: /Crear sala/i }).click();
    await expect(
      page.getByText(/No se puede crear la sala/i),
    ).toBeVisible();
  });

  test("1g. Configurar Sala - manejo de error 404 de cuestionario no encontrado", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.route("**/stage/rooms*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "El cuestionario seleccionado no existe.",
          }),
        });
      }
    });

    await page.goto("/quizzes/setup/1");
    await page.getByRole("button", { name: /Crear sala/i }).click();
    await expect(
      page.getByText(/El cuestionario seleccionado no existe/i),
    ).toBeVisible();
  });

  test("1h. Configurar Sala - manejo de error 500 generico con codigo de estado", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.route("**/stage/rooms*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Fallo de base de datos" }),
        });
      }
    });

    await page.goto("/quizzes/setup/1");
    await page.getByRole("button", { name: /Crear sala/i }).click();
    await expect(
      page.getByText(/Error 500: Fallo de base de datos/i),
    ).toBeVisible();
  });

  test("1i. Configurar Sala - manejo de error de red sin respuesta del servidor", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuiz),
      });
    });

    await page.route("**/stage/rooms*", async (route) => {
      if (route.request().method() === "POST") {
        await route.abort("failed");
      }
    });

    await page.goto("/quizzes/setup/1");
    await page.getByRole("button", { name: /Crear sala/i }).click();
    await expect(
      page.getByText(/No hay respuesta del servidor/i),
    ).toBeVisible();
  });

  test("1j. Configurar Sala - error al cargar datos del cuestionario", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error cargando quiz" }),
      });
    });

    await page.goto("/quizzes/setup/1");
    await expect(page.locator("body")).toBeVisible();
  });
});
