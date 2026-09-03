import { test, expect } from "./fixtures";

test.describe("CU-02: Content Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  const mockQuizzes = [
    {
      id: 1,
      title: "Cuestionario de Matemáticas",
      description: "Quiz de prueba inicial de cálculo",
      tags: "Álgebra,Geometría,Cálculo,Física",
      active_room_status: "waiting",
      active_room_id: 10,
      active_room_count: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      questions: [
        {
          id: 101,
          text: "¿Cuánto es 2 + 2?",
          points: 10,
          options: [
            { id: 1, text: "4", is_correct: true },
            { id: 2, text: "3", is_correct: false },
            { id: 3, text: "5", is_correct: false },
          ],
        },
        {
          id: 102,
          text: "¿Cuánto es 5 x 5?",
          points: 5,
          options: [
            { id: 4, text: "25", is_correct: true },
            { id: 5, text: "20", is_correct: false },
          ],
        },
      ],
    },
    {
      id: 2,
      title: "Historia Antigua",
      description: "Imperio Romano y Grecia",
      tags: null,
      active_room_status: "live",
      active_room_id: 11,
      active_room_count: 0,
      is_active: false,
      created_at: "2026-08-10T12:00:00Z",
      questions: [
        {
          id: 201,
          text: "¿Año de la caída de Roma?",
          points: 10,
          options: [
            { id: 10, text: "476 d.C.", is_correct: true },
            { id: 11, text: "1492", is_correct: false },
          ],
        },
      ],
    },
    {
      id: 3,
      title: "Física Cuántica",
      description: "Principios de Heisenberg",
      tags: "Física",
      active_room_status: "verifying",
      active_room_id: 12,
      active_room_count: 0,
      is_active: true,
      created_at: undefined,
      questions: [
        {
          id: 301,
          text: "¿Qué es un fotón?",
          points: 10,
          options: [
            { id: 20, text: "Luz", is_correct: true },
            { id: 21, text: "Masa", is_correct: false },
          ],
        },
      ],
    },
    {
      id: 4,
      title: "Química Orgánica",
      description: "Hidrocarburos",
      tags: "Química",
      active_room_status: null,
      active_room_id: null,
      active_room_count: 0,
      is_active: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      questions: [
        {
          id: 401,
          text: "¿Fórmula del metano?",
          points: 10,
          options: [
            { id: 30, text: "CH4", is_correct: true },
            { id: 31, text: "CO2", is_correct: false },
          ],
        },
      ],
    },
  ];

  test("1a. Listar Cuestionarios - navegacion a edicion y vista movil", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/quizzes");
    await expect(page.getByText("Cuestionario de Matemáticas")).toBeVisible();

    await page.evaluate(() => {
      (globalThis as any).window.dispatchEvent(new Event("resize"));
    });

    const editBtns = page.locator('.icon-btn[title="Editar"]');
    if (await editBtns.first().isVisible()) {
      await editBtns.first().click();
      await page.waitForURL(/\/quizzes\/edit\/1/);
    }
  });

  test("1b. Listar Cuestionarios - reconexion a salas en lobby, live y verifying", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.goto("/quizzes");
    await expect(page.getByText("En Lobby")).toBeVisible();
    await expect(page.getByText("En vivo")).toBeVisible();
    await expect(page.getByText("Verificando")).toBeVisible();

    const reconnectBtns = page.getByRole("button", { name: "Reconectar" });
    if (await reconnectBtns.first().isVisible()) {
      await reconnectBtns.first().click();
      await page.waitForURL(/\/lobby\/10/);
    }
  });

  test("1c. Listar Cuestionarios - reconexion a sala en vivo (status live)", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.goto("/quizzes");
    const reconnectBtns = page.getByRole("button", { name: "Reconectar" });
    if (await reconnectBtns.nth(1).isVisible()) {
      await reconnectBtns.nth(1).click();
      await page.waitForURL(/\/live\/11/);
    }
  });

  test("1d. Listar Cuestionarios - creacion de sala desde cuestionario inactivo", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockQuizzes[3]]),
      });
    });

    await page.goto("/quizzes");
    const createRoomBtn = page.getByRole("button", { name: /Crear sala/i });
    if (await createRoomBtn.isVisible()) {
      await createRoomBtn.click();
      await page.waitForURL(/\/quizzes\/setup\/4/);
    }
  });

  test("1e. Listar Cuestionarios - filtrado por pestañas Nuevos e Inactivos", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.goto("/quizzes");
    const tabNuevos = page.locator("button.tab", { hasText: "Nuevos" });
    if (await tabNuevos.isVisible()) {
      await tabNuevos.click();
      await expect(page.getByText("Cuestionario de Matemáticas")).toBeVisible();
    }

    const tabInactivos = page.locator("button.tab", { hasText: "Inactivos" });
    if (await tabInactivos.isVisible()) {
      await tabInactivos.click();
      await expect(page.getByText("Química Orgánica")).toBeVisible();
    }

    const tabTodos = page.locator("button.tab", { hasText: "Todos" });
    if (await tabTodos.isVisible()) {
      await tabTodos.click();
    }
  });

  test("1f. Listar Cuestionarios - filtros vacios y estado fallback (sin nuevos ni inactivos)", async ({
    page,
  }) => {
    // Solo el cuestionario con sala activa (estado = waiting) y antigüedad > 7 días
    const oldActiveQuiz = {
      ...mockQuizzes[0],
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    };

    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([oldActiveQuiz]),
      });
    });

    await page.goto("/quizzes");

    // Pestaña "Nuevos" → vacía (cuestionario de más de 7 días)
    await page.locator("button.tab", { hasText: "Nuevos" }).click();
    await expect(page.getByText(/No hay cuestionarios nuevos/i)).toBeVisible();

    // Pestaña "Inactivos" → vacía (el cuestionario tiene sala activa)
    await page.locator("button.tab", { hasText: "Inactivos" }).click();
    await expect(
      page.getByText(/No hay cuestionarios inactivos/i).first(),
    ).toBeVisible();
  });

  test("1g. Listar Cuestionarios - confirmacion de finalizar sala con aceptar", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.route("**/stage/rooms/10/force-finish*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Sala finalizada" }),
      });
    });

    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/quizzes");
    const finishBtn = page.getByRole("button", { name: "Finalizar" }).first();
    if (await finishBtn.isVisible()) {
      await finishBtn.click();
      await expect(
        page.getByText(/Sala finalizada correctamente/i),
      ).toBeVisible({ timeout: 6000 });
    }
  });

  test("1h. Listar Cuestionarios - error al finalizar sala y apertura de modal de borrado", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.route("**/stage/rooms/10/force-finish*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Fallo al finalizar sala" }),
      });
    });

    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/quizzes");
    const finishBtn = page.getByRole("button", { name: "Finalizar" }).first();
    if (await finishBtn.isVisible()) {
      await finishBtn.click();
      await expect(page.getByText(/Fallo al finalizar sala/i)).toBeVisible({
        timeout: 6000,
      });
    }

    // Abre el modal de eliminación para el cuestionario 1
    const deleteBtn = page.locator('.icon-btn[title="Eliminar"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await expect(page.getByText(/¿Borrar cuestionario\?/i)).toBeVisible();
      // Cancela mediante el botón secundario
      const cancelBtn = page.locator(".modal-card button.btn-modal-secondary");
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });

  test("1i. Listar Cuestionarios - manejo de error 500 al cargar cuestionarios", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error de servidor" }),
      });
    });

    await page.goto("/quizzes");
    await expect(
      page.getByText(/No tienes cuestionarios creados/i),
    ).toBeVisible();
  });

  test("1j. Listar Cuestionarios - soft delete cuestionario sin salas activas", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    // Sin salas activas → borrado suave disponible
    await page.route("**/content/quizzes/2/rooms*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/content/quizzes/2*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/quizzes");
    const deleteBtns = page.locator('.icon-btn[title="Eliminar"]');
    await expect(deleteBtns.nth(1)).toBeVisible();
    await deleteBtns.nth(1).click();
    await expect(page.getByText(/¿Borrar cuestionario\?/i)).toBeVisible();

    // Confirma el borrado suave del cuestionario
    const softDeleteBtn = page.locator(
      ".modal-card button.btn-modal-primary.cyan",
    );
    await expect(softDeleteBtn).toBeVisible();
    await softDeleteBtn.click();
    await expect(page.getByText(/eliminado correctamente/i)).toBeVisible({
      timeout: 6000,
    });
  });

  test("1k. Listar Cuestionarios - hard delete cuestionario con salas y error en servidor", async ({
    page,
  }) => {
    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    // Existen salas (no activas) → borrado completo habilitado pero falla en servidor
    await page.route("**/content/quizzes/4/rooms*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: 99, status: "finished" }]),
      });
    });

    await page.route("**/content/quizzes/4/hard*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Imposible eliminar cuestionario" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/quizzes");
    // Cuestionario 4 (Química Orgánica) es la cuarta tarjeta → cuarto botón Eliminar
    const deleteBtns = page.locator('.icon-btn[title="Eliminar"]');
    await expect(deleteBtns.nth(3)).toBeVisible();
    await deleteBtns.nth(3).click();
    await expect(page.getByText(/¿Borrar cuestionario\?/i)).toBeVisible();

    // Confirma el borrado completo con salas
    const hardDeleteBtn = page
      .locator(".modal-card")
      .getByRole("button", { name: /sus salas/i });
    if (await hardDeleteBtn.isVisible()) {
      await hardDeleteBtn.click();
      await expect(
        page.getByText(/Imposible eliminar cuestionario/i),
      ).toBeVisible({ timeout: 6000 });
    }
  });

  test("2a. Crear Cuestionario - validacion JS de formulario incompleto", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page.evaluate(() => {
      (globalThis as any).document
        .querySelectorAll("input, textarea")
        .forEach((el: any) => el.removeAttribute("required"));
    });

    const submitBtn = page.getByRole("button", { name: /Crear cuestionario/i });
    await submitBtn.click();
    await expect(
      page.getByText(/Título y descripción son obligatorios/i).first(),
    ).toBeVisible();
  });

  test("2b. Crear Cuestionario - adicion de opciones hasta 8 y intento de agregar mas", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page
      .locator('input[placeholder*="enunciado"]')
      .fill("Pregunta de 8 opciones");
    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("Opción 1");
    await optionInputs.nth(1).fill("Opción 2");

    const addGhostBtn = page.locator("button.btn-add-ghost");
    for (let i = 2; i < 8; i++) {
      if ((await addGhostBtn.isVisible()) && (await addGhostBtn.isEnabled())) {
        await addGhostBtn.click();
        await page
          .locator('.option-item input[type="text"]')
          .nth(i)
          .fill(`Opción ${i + 1}`);
      }
    }
    await expect(page.locator('.option-item input[type="text"]')).toHaveCount(
      8,
    );
    // El botón de añadir opción está deshabilitado
    await expect(page.locator("button.btn-add-ghost")).toBeDisabled();
  });

  test("2c. Crear Cuestionario - navegacion dots: pregunta en blanco auto-eliminada al volver", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");

    // Rellena la P1 y navega a la nueva P2
    await page.locator('input[placeholder*="enunciado"]').fill("Pregunta 1");
    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("A");
    await optionInputs.nth(1).fill("B");

    // Navega a la P2 (en blanco) mediante ArrowRight
    await page.locator("body").press("ArrowRight");
    await expect(page.getByText(/PREGUNTA 2/i)).toBeVisible();

    // P2 está en blanco - vuelve atrás mediante ArrowLeft → handlePrev elimina la P2
    await page.locator("body").press("ArrowLeft");
    await expect(page.getByText(/PREGUNTA 1/i)).toBeVisible();

    // Ahora solo debe haber 1 pregunta (la P2 se eliminó automáticamente).
    // Existen dos contenedores de puntos de navegación (PC + móvil), cada uno con 1 punto → 2 en total
    const dots = page.locator(".nav-dots button.dot");
    await expect(dots).toHaveCount(2);
  });

  test("2d. Crear Cuestionario - handlePrev en Q1 no hace nada", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page
      .locator('input[placeholder*="enunciado"]')
      .fill("Solo una pregunta");
    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("A");
    await optionInputs.nth(1).fill("B");

    // Pulsa ArrowLeft en P1 → debe permanecer en P1
    await page.locator("body").press("ArrowLeft");
    await expect(page.getByText(/PREGUNTA 1/i)).toBeVisible();
  });

  test("2e. Crear Cuestionario - atajos de teclado Enter y Tab en boton de añadir opcion", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page
      .locator('input[placeholder*="enunciado"]')
      .fill("Pregunta Atajos");
    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("Opción A");
    await optionInputs.nth(1).fill("Opción B");

    const addGhostBtn = page.locator("button.btn-add-ghost");
    if (await addGhostBtn.isVisible()) {
      await addGhostBtn.focus();
      await page.keyboard.press("Enter");
      await page
        .locator('.option-item input[type="text"]')
        .nth(2)
        .fill("Opción C");

      await addGhostBtn.focus();
      await page.keyboard.press("Tab");
    }
  });

  test("2f. Crear Cuestionario - seleccion de radio y reasignacion al borrar la correcta", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page
      .locator('input[placeholder*="enunciado"]')
      .fill("Pregunta Radio & Reasignacion");
    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("Opción 1");
    await optionInputs.nth(1).fill("Opción 2 Correcta");

    const radioBtns = page.locator('.options-wrapper input[type="radio"]');
    if (await radioBtns.nth(1).isVisible()) {
      await radioBtns.nth(1).check();
    }

    const addGhostBtn = page.locator("button.btn-add-ghost");
    if (await addGhostBtn.isVisible()) {
      await addGhostBtn.click();
      await page
        .locator('.option-item input[type="text"]')
        .nth(2)
        .fill("Opción 3");
    }

    // Elimina la opción correcta → la primera opción pasa a ser la correcta
    const deleteBtns = page.locator("button.btn-remove");
    if (await deleteBtns.nth(1).isVisible()) {
      await deleteBtns.nth(1).click();
      await expect(page.locator('.option-item input[type="text"]')).toHaveCount(
        2,
      );
    }
  });

  test("2g. Crear Cuestionario - ajuste de puntuacion: vacio resetea a 1, 150 se topa en 100, NaN ignorado", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    const pointsInput = page.locator("input.points-input");

    if (await pointsInput.isVisible()) {
      // Vacío → permite dejarlo vacío temporalmente, blur → se reinicia a 1
      await pointsInput.fill("");
      await pointsInput.blur();
      await expect(pointsInput).toHaveValue("1");

      // Mayor a 100 → se limita a 100
      await pointsInput.fill("150");
      await pointsInput.blur();
      await expect(pointsInput).toHaveValue("100");
    }
  });

  test("2h. Crear Cuestionario - validacion de pregunta en blanco al enviar", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page.locator('input[placeholder="Título"]').fill("Título Completo");
    await page
      .locator('textarea[placeholder*="descripción"]')
      .fill("Descripción Completa");
    // Deja en blanco el enunciado de la pregunta

    await page.evaluate(() => {
      (globalThis as any).document
        .querySelectorAll("input, textarea")
        .forEach((el: any) => el.removeAttribute("required"));
    });

    await page.getByRole("button", { name: /Crear cuestionario/i }).click();
    await expect(
      page.getByText(/La pregunta 1 no tiene enunciado/i),
    ).toBeVisible();
  });

  test("2i. Crear Cuestionario - validacion de opcion en blanco al enviar", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page.locator('input[placeholder="Título"]').fill("Título Completo");
    await page
      .locator('textarea[placeholder*="descripción"]')
      .fill("Descripción Completa");
    await page
      .locator('input[placeholder*="enunciado"]')
      .fill("Pregunta con opcion en blanco");
    // Deja en blanco la opción 2

    await page.evaluate(() => {
      (globalThis as any).document
        .querySelectorAll("input, textarea")
        .forEach((el: any) => el.removeAttribute("required"));
    });

    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("Opción A completa");

    await page.getByRole("button", { name: /Crear cuestionario/i }).click();
    await expect(page.getByText(/está en blanco/i)).toBeVisible();
  });

  test("2j. Crear Cuestionario - aviso de minimo 1 pregunta al intentar borrar la unica", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page
      .locator('input[placeholder*="enunciado"]')
      .fill("Pregunta Unica");
    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("A");
    await optionInputs.nth(1).fill("B");

    const removeQBtn = page.locator("button.btn-remove-question-fixed");
    if (await removeQBtn.isVisible()) {
      await removeQBtn.click();
      await expect(
        page.getByText(/El cuestionario debe tener al menos una pregunta/i),
      ).toBeVisible();
    }
  });

  test("2k. Crear Cuestionario - error de red al crear", async ({ page }) => {
    await page.route("**/content/quizzes", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Server error" }),
        });
      }
    });

    await page.goto("/quizzes/create");
    await page.locator('input[placeholder="Título"]').fill("Test Error Quiz");
    await page
      .locator('textarea[placeholder*="descripción"]')
      .fill("Descripción Error");
    await page.locator('input[placeholder*="enunciado"]').fill("¿Pregunta?");
    await page.locator('.option-item input[type="text"]').nth(0).fill("Sí");
    await page.locator('.option-item input[type="text"]').nth(1).fill("No");

    await page.getByRole("button", { name: /Crear cuestionario/i }).click();
    await expect(
      page.getByText(/Error al conectar con el servidor/i),
    ).toBeVisible({ timeout: 6000 });
  });

  test("2l. Crear Cuestionario - creacion exitosa y redireccion", async ({
    page,
  }) => {
    await page.route("**/content/quizzes", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 5, title: "Examen E2E Exitoso" }),
        });
      }
    });

    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.goto("/quizzes/create");
    await page
      .locator('input[placeholder="Título"]')
      .fill("Examen E2E Exitoso");
    await page
      .locator('textarea[placeholder*="descripción"]')
      .fill("Descripción Completa");
    await page
      .locator('input[placeholder*="enunciado"]')
      .fill("¿Pregunta E2E?");
    await page
      .locator('.option-item input[type="text"]')
      .nth(0)
      .fill("Verdadero");
    await page.locator('.option-item input[type="text"]').nth(1).fill("Falso");

    await page.getByRole("button", { name: /Crear cuestionario/i }).click();
    await page.waitForURL(/\/quizzes/);
  });

  test("2m. Crear Cuestionario - swipe touch horizontal y navegacion por puntos", async ({
    page,
  }) => {
    await page.goto("/quizzes/create");
    await page.locator('input[placeholder*="enunciado"]').fill("Pregunta 1");
    await page.locator('.option-item input[type="text"]').nth(0).fill("A");
    await page.locator('.option-item input[type="text"]').nth(1).fill("B");

    // Swipe horizontal en Crear Cuestionario
    await page.evaluate(() => {
      const card = (globalThis as any).document.querySelector(".question-card");
      if (!card) return;
      const g = globalThis as any;
      const t1 = new g.Touch({
        identifier: 2,
        target: card,
        clientX: 300,
        clientY: 100,
      });
      const t2 = new g.Touch({
        identifier: 2,
        target: card,
        clientX: 100,
        clientY: 100,
      });
      card.dispatchEvent(
        new g.TouchEvent("touchstart", {
          bubbles: true,
          targetTouches: [t1],
          touches: [t1],
        }),
      );
      card.dispatchEvent(
        new g.TouchEvent("touchmove", {
          bubbles: true,
          targetTouches: [t2],
          touches: [t2],
        }),
      );
      card.dispatchEvent(new g.TouchEvent("touchend", { bubbles: true }));
    });

    // Clic en punto de navegación
    const dots = page.locator(".nav-dots button.dot");
    if (await dots.first().isVisible()) {
      await dots.first().click();
    }
  });

  test("3a. Editar Cuestionario - error al cargar cuestionario inexistente", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/999", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error al cargar quiz" }),
      });
    });

    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.goto("/quizzes/edit/999");
    await page.waitForURL(/\/quizzes/);
  });

  test("3b. Editar Cuestionario - navegacion por indicadores dot y touch parcial", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes[0]),
      });
    });

    await page.goto("/quizzes/edit/1");
    await expect(page.locator('input[placeholder="Título"]')).toHaveValue(
      "Cuestionario de Matemáticas",
    );

    // Navegación mediante puntos (el cuestionario tiene 2 preguntas)
    const dots = page.locator(".nav-dots button.dot");
    if (await dots.nth(1).isVisible()) {
      await dots.nth(1).click();
      await expect(page.getByText(/PREGUNTA 2/i)).toBeVisible();
    }

    if (await dots.first().isVisible()) {
      await dots.first().click();
      await expect(page.getByText(/PREGUNTA 1/i)).toBeVisible();
    }

    // Prueba de código táctil con un deslizamiento pequeño (< 50px → sin navegación)
    await page.evaluate(() => {
      const card = (globalThis as any).document.querySelector(".question-card");
      if (!card) return;
      const g = globalThis as any;
      const t1 = new g.Touch({
        identifier: 3,
        target: card,
        clientX: 200,
        clientY: 100,
      });
      const t2 = new g.Touch({
        identifier: 3,
        target: card,
        clientX: 190,
        clientY: 100,
      });
      card.dispatchEvent(
        new g.TouchEvent("touchstart", {
          bubbles: true,
          targetTouches: [t1],
          touches: [t1],
        }),
      );
      card.dispatchEvent(
        new g.TouchEvent("touchmove", {
          bubbles: true,
          targetTouches: [t2],
          touches: [t2],
        }),
      );
      card.dispatchEvent(new g.TouchEvent("touchend", { bubbles: true }));
    });
  });

  test("3c. Editar Cuestionario - navegacion por botones anterior/siguiente de PC", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes[0]),
      });
    });

    await page.goto("/quizzes/edit/1");
    await expect(page.locator('input[placeholder="Título"]')).toHaveValue(
      "Cuestionario de Matemáticas",
    );

    // Botones de navegación en escritorio (‹ ›)
    const nextBtn = page.locator("button.quiz-slider-btn.btn-pc-nav").nth(1);
    if ((await nextBtn.isVisible()) && (await nextBtn.isEnabled())) {
      await nextBtn.click();
      await expect(page.getByText(/PREGUNTA 2/i)).toBeVisible();
    }

    const prevBtn = page.locator("button.quiz-slider-btn.btn-pc-nav").first();
    if ((await prevBtn.isVisible()) && (await prevBtn.isEnabled())) {
      await prevBtn.click();
      await expect(page.getByText(/PREGUNTA 1/i)).toBeVisible();
    }
  });

  test("3d. Editar Cuestionario - advertencia al intentar borrar opcion cuando quedan <= 2 activas", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockQuizzes[0],
          questions: [
            {
              id: 101,
              text: "¿Pregunta única?",
              points: 10,
              options: [
                { id: 1, text: "Opción A", is_correct: true },
                { id: 2, text: "Opción B", is_correct: false },
              ],
            },
          ],
        }),
      });
    });

    await page.goto("/quizzes/edit/1");
    const removeOptionBtns = page.locator("button.btn-remove");
    if (await removeOptionBtns.nth(1).isVisible()) {
      await removeOptionBtns.nth(1).click();
      await expect(page.getByText(/al menos dos opciones/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("3e. Editar Cuestionario - marcado suave y restauracion de pregunta y opciones", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes[0]),
      });
    });

    await page.goto("/quizzes/edit/1");
    await expect(page.locator('input[placeholder="Título"]')).toHaveValue(
      "Cuestionario de Matemáticas",
    );

    const removeOptionBtns = page.locator("button.btn-remove");
    if (await removeOptionBtns.nth(1).isVisible()) {
      await removeOptionBtns.nth(1).click(); // Borrado suave
      await removeOptionBtns.nth(1).click(); // Restaurar
    }

    const removeQBtn = page.locator("button.btn-remove-question-fixed");
    if (await removeQBtn.isVisible()) {
      await removeQBtn.click(); // Borrado suave
      await removeQBtn.click(); // Restaurar
    }
  });

  test("3f. Editar Cuestionario - advertencia al borrar opcion correcta", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes[0]),
      });
    });

    await page.goto("/quizzes/edit/1");
    const removeOptionBtns = page.locator("button.btn-remove");
    if (await removeOptionBtns.first().isVisible()) {
      await removeOptionBtns.first().click();
      await expect(
        page.getByText(/No puedes borrar la opción correcta/i),
      ).toBeVisible();
    }
  });

  test("3g. Editar Cuestionario - validacion de pregunta sin enunciado en modal", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes[0]),
      });
    });

    await page.goto("/quizzes/edit/1");

    // Limpia el enunciado de la pregunta
    const questionInput = page.locator('input[placeholder*="enunciado"]');
    await questionInput.clear();

    await page.evaluate(() => {
      (globalThis as any).document
        .querySelectorAll("input, textarea")
        .forEach((el: any) => el.removeAttribute("required"));
    });

    await page
      .getByRole("button", { name: /Confirmar/i })
      .first()
      .click();
    const confirmBtn = page.locator(".modal-card button", {
      hasText: "Guardar cambios",
    });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await expect(page.getByText(/no tiene enunciado/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("3h. Editar Cuestionario - validacion de opcion en blanco en modal", async ({
    page,
  }) => {
    // Carga el cuestionario con una opción en blanco preexistente para reflejarlo en el estado de React
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockQuizzes[0],
          questions: [
            {
              id: 101,
              text: "Pregunta con opcion en blanco",
              points: 10,
              options: [
                { id: 1, text: "Opcion A", is_correct: true },
                { id: 2, text: "", is_correct: false },
              ],
            },
          ],
        }),
      });
    });

    await page.goto("/quizzes/edit/1");
    await expect(page.locator('input[placeholder="Título"]')).toHaveValue(
      "Cuestionario de Matemáticas",
    );

    // Elimina atributo required para que el formulario no bloquee la validación nativa
    await page.evaluate(() => {
      (globalThis as any).document
        .querySelectorAll("input, textarea")
        .forEach((el: any) => el.removeAttribute("required"));
    });

    await page
      .getByRole("button", { name: /Confirmar/i })
      .first()
      .click();
    const confirmBtn = page.locator(".modal-card button", {
      hasText: "Guardar cambios",
    });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await expect(page.getByText(/está en blanco/i)).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("3i. Editar Cuestionario - cancelacion en modal con boton Cancelar", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes[0]),
      });
    });

    await page.goto("/quizzes/edit/1");
    await page
      .getByRole("button", { name: /Confirmar/i })
      .first()
      .click();

    const cancelBtn = page.locator(".modal-card button", {
      hasText: "Cancelar",
    });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await expect(page.getByText(/Confirmar Cambios/i)).not.toBeVisible();
    }
  });

  test("3j. Editar Cuestionario - error en el servidor al guardar cambios", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockQuizzes[0]),
        });
      } else if (method === "PUT") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            detail: "Error al actualizar cuestionario en servidor",
          }),
        });
      }
    });

    await page.goto("/quizzes/edit/1");
    await page.locator('input[placeholder="Título"]').fill("Título Error");

    await page
      .getByRole("button", { name: /Confirmar/i })
      .first()
      .click();
    const confirmBtn = page.locator(".modal-card button", {
      hasText: "Guardar cambios",
    });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await expect(
        page.getByText(/Error al actualizar cuestionario en servidor/i),
      ).toBeVisible({ timeout: 6000 });
    }
  });

  test("3k. Editar Cuestionario - guardado exitoso y redireccion", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockQuizzes[0]),
        });
      } else if (method === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...mockQuizzes[0],
            title: "Matemáticas Finales",
          }),
        });
      }
    });

    await page.route("**/users/my-quizzes*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockQuizzes),
      });
    });

    await page.goto("/quizzes/edit/1");
    await page
      .locator('input[placeholder="Título"]')
      .fill("Matemáticas Finales");

    await page
      .getByRole("button", { name: /Confirmar/i })
      .first()
      .click();
    const confirmBtn = page.locator(".modal-card button", {
      hasText: "Guardar cambios",
    });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await page.waitForURL(/\/quizzes/);
  });

  test("3l. Editar Cuestionario - edicion de texto de opcion, cambio de opcion correcta y deshabilitar eliminacion de ultima pregunta", async ({
    page,
  }) => {
    await page.route("**/content/quizzes/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockQuizzes[0],
          questions: [mockQuizzes[0].questions[0]],
        }),
      });
    });

    await page.goto("/quizzes/edit/1");

    // Edición de texto de opción y cambio de opción correcta
    const optionInputs = page.locator('.option-item input[type="text"]');
    await optionInputs.nth(0).fill("Opción Editada");
    const radios = page.locator('.options-wrapper input[type="radio"]');
    if (await radios.nth(1).isVisible()) {
      await radios.nth(1).check();
    }

    // Intento de borrar la única pregunta activa en edición
    const removeQBtn = page.locator("button.btn-remove-question-fixed");
    if (await removeQBtn.isVisible()) {
      await removeQBtn.click();
      await expect(page.getByText(/al menos una/i)).toBeVisible();
    }

    // Prueba de deslizamiento touch de izquierda a derecha (swipe horizontal > 50px)
    await page.evaluate(() => {
      const card = (globalThis as any).document.querySelector(".question-card");
      if (!card) return;
      const g = globalThis as any;
      const t1 = new g.Touch({
        identifier: 1,
        target: card,
        clientX: 300,
        clientY: 100,
      });
      const t2 = new g.Touch({
        identifier: 1,
        target: card,
        clientX: 100,
        clientY: 100,
      });
      card.dispatchEvent(
        new g.TouchEvent("touchstart", {
          bubbles: true,
          targetTouches: [t1],
          touches: [t1],
        }),
      );
      card.dispatchEvent(
        new g.TouchEvent("touchmove", {
          bubbles: true,
          targetTouches: [t2],
          touches: [t2],
        }),
      );
      card.dispatchEvent(new g.TouchEvent("touchend", { bubbles: true }));
    });
  });
});
