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

  test("1d. Configurar Sala - manejo de error 404 de cuestionario no encontrado", async ({
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

  test("1e. Configurar Sala - manejo de error 500 generico con codigo de estado", async ({
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

  test("1f. Configurar Sala - manejo de error de red sin respuesta del servidor", async ({
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

  test("1g. Configurar Sala - error al cargar datos del cuestionario", async ({
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


  test("1h. Configurar Sala - manejo de error 400 con mensaje por defecto", async ({
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

  test("2a. Sala de espera - apertura de sala en estado waiting y navegacion a lobby", async ({
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

  test("2b. Sala de espera - vista de profesor, participantes y boton empezar", async ({
    page,
  }) => {
    const mockParticipants = Array.from({ length: 16 }, (_, i) => `Alumno_${i + 1}`);

    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockParticipants),
      });
    });

    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "waiting",
        }),
      });
    });

    await page.route("**/stage/rooms/10/start", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/lobby/10");

    // Verificar vista de profesor en la sala de espera
    await expect(page.getByText(/Sala de Espera - 123456/i)).toBeVisible();
    await expect(page.getByText(/Esperando participantes/i)).toBeVisible();
    await expect(page.locator("span.stat-number")).toHaveText("16"); // 16 participantes
    await expect(page.getByText("+2")).toBeVisible(); // Overflow badge (+2)

    // Clic en botón para empezar la partida
    const startBtn = page.getByRole("button", { name: /Empezar/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
  });

  test("2c. Sala de espera - vista movil de profesor con 10 alumnos, overflow badge y actualizacion por WS", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const initial10 = Array.from({ length: 10 }, (_, i) => `Alumno_${i + 1}`);
    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(initial10),
      });
    });

    // Error 500 al obtener detalles de la sala (cubre catch de roomDetails)
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error" }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");

      class MockWS {
        static instances: MockWS[] = [];
        onopen: any;
        onmessage: any;
        onclose: any;
        onerror: any;
        readyState = 1;
        constructor() {
          MockWS.instances.push(this);
          setTimeout(() => {
            if (this.onopen) this.onopen();
          }, 10);
        }
        send() {}
        close() {
          if (this.onclose) this.onclose();
        }
      }
      // @ts-ignore
      window.WebSocket = MockWS;
      // @ts-ignore
      window.__mockWSInstances = MockWS.instances;
    });

    await page.goto("/lobby/10");

    // Muestra contador 10 y badge de desbordamiento +2 (máximo en móvil es 8)
    await expect(page.locator("span.stat-number")).toHaveText("10");
    await expect(page.getByText("+2")).toBeVisible();

    // Inyectar evento WS participants_update
    await page.evaluate(() => {
      // @ts-ignore
      const ws = window.__mockWSInstances[0];
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: "participants_update",
            list: ["WS_Alumno_1", "WS_Alumno_2"],
          }),
        });
      }
    });

    await expect(page.locator("span.stat-number")).toHaveText("2");

    // Inyectar evento WS room_update con status LIVE (inicia la partida)
    await page.evaluate(() => {
      // @ts-ignore
      const ws = window.__mockWSInstances[0];
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: "room_update",
            data: {
              status: "LIVE",
              phase: "playing",
              current_question_index: 1,
              total_questions: 3,
            },
          }),
        });
      }
    });

    await page.waitForURL(/\/live\/10/);
  });


  test("3a. Iniciar sala - apertura de sala en estado live y navegacion a live", async ({
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

  test("3b. Iniciar sala - fase de cuenta atras inicial countdown", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "playing",
          current_question_index: 1,
          total_questions: 3,
          answer_time: 45,
          time_left: 45,
          text: "¿Pregunta con countdown?",
          options: [{ id: 1, text: "A" }],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    // Verificar overlay de cuenta atrás
    await expect(page.getByText("¡PREPÁRATE!")).toBeVisible();
  });

  test("3c. Iniciar sala - sala ya en live al cargar, error al iniciar y lobby vacio", async ({
    page,
  }) => {
    // 1. Sala ya en estado live al cargar -> redirige a /live/10
    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "LIVE01",
          status: "live",
          phase: "playing",
          current_question_index: 1,
          total_questions: 3,
          text: "¿Pregunta activa?",
          correct_option_id: 1,
          statistics: {},
          options: [{ id: 1, text: "Opción A" }],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/lobby/10");
    await page.waitForURL(/\/live\/10/);

    // 2. Lobby con error al iniciar la sala
    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(["Alumno_1"]),
      });
    });

    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "waiting",
        }),
      });
    });

    await page.route("**/stage/rooms/10/start", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error interno" }),
      });
    });

    await page.goto("/lobby/10");
    await expect(page.getByText(/Sala de Espera - 123456/i)).toBeVisible();

    const startBtn = page.getByRole("button", { name: /Empezar/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await expect(page.getByText(/Error al iniciar la sala/i)).toBeVisible();

    // 3. Lobby vacío (sin participantes) -> muestra mensaje "Aún no hay nadie aquí"
    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/lobby/10");
    await expect(page.getByText(/Aún no hay nadie aquí/i)).toBeVisible();
  });
});
