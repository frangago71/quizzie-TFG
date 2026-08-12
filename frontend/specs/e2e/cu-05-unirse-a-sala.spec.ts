import { test, expect } from "./fixtures";

test.describe("CU-05: Student Join Room", () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar cualquier sesión previa
    await page.addInitScript(() => {
      sessionStorage.clear();
    });
  });

  test("1a. Código de Sala - validaciones, navegacion entre casillas y error de codigo invalido", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/000000", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Código de sala no encontrado" }),
      });
    });

    await page.goto("/");
    await expect(page.getByText(/¿Listo para el desafío\?/i)).toBeVisible();

    const boxes = page.locator("input.code-box");
    await expect(boxes).toHaveCount(6);

    // Escribir caracteres no numéricos es ignorado
    await boxes.first().focus();
    await page.keyboard.type("a");
    await expect(boxes.first()).toHaveValue("");

    // Escribir dígitos secuenciales con auto-enfoque por teclado
    await page.keyboard.type("000000");
    await expect(boxes.nth(5)).toHaveValue("0");

    // Clic en botón de entrar (falla de código invalido/inexistente)
    const enterBtn = page.locator("button.btn-main");
    await expect(enterBtn).toBeEnabled();
    await enterBtn.click();
    await expect(page.getByText(/Código de sala no encontrado/i)).toBeVisible();
  });

  test("1b. Código de Sala - verificacion exitosa y redireccion a ingreso de UVUS", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          room_id: 10,
          status: "waiting",
        }),
      });
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");

    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);
  });

  test("1c. Código de Sala - retroceso en casillas vacias y errores de API sin detalle", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/111111", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");

    // Escribir 1 y luego retroceder en casilla vacía
    await boxes.first().focus();
    await page.keyboard.press("1");
    await boxes.nth(1).press("Backspace");
    await expect(boxes.first()).toBeFocused();

    // Escribir 111111 y enviar con error genérico
    await page.keyboard.type("111111");
    await page.locator("button.btn-main").click();
    await expect(page.getByText(/Error al verificar el código/i)).toBeVisible();
  });


  test("2a. Introducir UVUS - validacion de formato de UVUS invalido", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          room_id: 10,
          status: "waiting",
        }),
      });
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);

    const nicknameInput = page.locator("input.nickname-input");
    await nicknameInput.fill("formato-incorrecto");
    await page.locator("button.btn-main").click();
    await expect(page.getByText(/Formato de uvus inválido/i)).toBeVisible();
  });

  test("2b. Introducir UVUS - navegacion con alumno existente a sala en espera", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          room_id: 10,
          status: "waiting",
        }),
      });
    });

    await page.route("**/users/students/verify/abc1234", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ exists: true, student_id: 50 }),
      });
    });

    await page.route("**/stage/participants*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ participant_id: 99, status: "joined" }),
      });
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);

    await expect(page.getByText(/Sala 123456/i)).toBeVisible();
    await expect(page.getByText(/En espera/i)).toBeVisible();

    // Formato inválido de UVUS
    const nicknameInput = page.locator("input.nickname-input");
    await nicknameInput.fill("inv-valido!!!");
    await page.locator("button.btn-main").click();
    await expect(page.getByText(/Formato de uvus inválido/i)).toBeVisible();

    // Formato válido de UVUS (patternA: 3 letras + 4 números)
    await nicknameInput.fill("abc1234");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/lobby\/10/);
  });

  test("2c. Introducir UVUS - navegacion a sala en vivo, error de API y boton de volver atras", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          room_id: 10,
          status: "live",
        }),
      });
    });

    await page.route("**/users/students/verify/abc1234", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error verificando estudiante" }),
      });
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);

    await expect(page.getByText(/En curso/i)).toBeVisible();

    // Error de verificación de estudiante
    const nicknameInput = page.locator("input.nickname-input");
    await nicknameInput.fill("abc1234");
    await page.locator("button.btn-main").click();
    await expect(page.getByText(/Error verificando estudiante/i)).toBeVisible();

    // Clic en botón volver atrás
    await page.locator("button.btn-back-link").click();
    await page.waitForURL((url) => url.pathname === "/");
  });

  test("3a. Registrar UVUS - cancelar registro y modificar UVUS", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          room_id: 10,
          status: "waiting",
        }),
      });
    });

    await page.route("**/users/students/verify/xyz1234", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ exists: false }),
      });
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);

    await page.locator("input.nickname-input").fill("xyz1234");
    await page.locator("button.btn-main").click();

    // Modal abierto
    await expect(page.getByText(/Estudiante no encontrado/i)).toBeVisible();
    await expect(page.getByText(/@xyz1234/i)).toBeVisible();

    // Cancelar en modal
    await page.locator(".modal-content button.btn-back-link").click();
    await expect(page.getByText(/Estudiante no encontrado/i)).not.toBeVisible();
  });

  test("3b. Registrar UVUS - registro exitoso de nuevo estudiante y fallo en servidor", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          room_id: 10,
          status: "waiting",
        }),
      });
    });

    await page.route("**/users/students/verify/xyz1234", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ exists: false }),
      });
    });

    // Error en creación de estudiante
    await page.route("**/users/students?nickname=xyz1234", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "No se pudo crear estudiante" }),
        });
      }
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);

    await page.locator("input.nickname-input").fill("xyz1234");
    await page.locator("button.btn-main").click();
    await expect(page.getByText(/Estudiante no encontrado/i)).toBeVisible();

    // Intentar crear estudiante (falla)
    await page.locator(".modal-content button.btn-main").click();
    await expect(page.getByText(/No se pudo crear estudiante/i)).toBeVisible();

    // Cambiar mock a éxito
    await page.route("**/users/students?nickname=xyz1234", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ student_id: 88 }),
        });
      }
    });

    await page.route("**/stage/participants*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ participant_id: 101, status: "joined" }),
      });
    });

    // Intentar crear estudiante (éxito)
    await page.locator(".modal-content button.btn-main").click();
    await page.waitForURL(/\/lobby\/10/);
  });


  test("4a. Nuevo Estudiante - sala en vivo con nuevo estudiante y error generico de verificacion", async ({
    page,
  }) => {
    let verifyCallCount = 0;
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      verifyCallCount++;
      if (verifyCallCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, room_id: 10, status: "waiting" }),
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      }
    });

    await page.route("**/users/students/verify/abc1234", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);

    await page.locator("input.nickname-input").fill("abc1234");
    await page.locator("button.btn-main").click();
    await expect(page.getByText(/Error en el proceso/i)).toBeVisible();
  });

  test("4b. Nuevo Estudiante - confirmacion de nuevo estudiante en sala en vivo y fallo generico", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/verify/123456", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          room_id: 10,
          status: "live",
        }),
      });
    });

    await page.route("**/users/students/verify/xyz1234", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ exists: false }),
      });
    });

    // Error genérico sin detail al crear estudiante
    await page.route("**/users/students?nickname=xyz1234", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      }
    });

    await page.goto("/");
    const boxes = page.locator("input.code-box");
    await boxes.first().focus();
    await page.keyboard.type("123456");
    await page.locator("button.btn-main").click();
    await page.waitForURL(/\/join\/123456/);

    await page.locator("input.nickname-input").fill("xyz1234");
    await page.locator("button.btn-main").click();
    await expect(page.getByText(/Estudiante no encontrado/i)).toBeVisible();

    // Clic en crear estudiante (falla con error genérico)
    await page.locator(".modal-content button.btn-main").click();
    await expect(page.getByText(/Error al registrar: Error desconocido/i)).toBeVisible();

    // Cambiar a éxito en creación y unirse a sala en vivo
    await page.route("**/users/students?nickname=xyz1234", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ student_id: 88 }),
        });
      }
    });

    await page.route("**/stage/participants*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ participant_id: 101, status: "joined" }),
      });
    });

    // Clic en crear estudiante (éxito en sala en vivo -> navega a /live/10)
    await page.locator(".modal-content button.btn-main").click();
    await page.waitForURL(/\/live\/10/);
  });

  test("5a. Sala de espera - vista de alumno y redireccion automatica al iniciar sala", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(["abc1234", "alumno2"]),
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

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/lobby/10");

    // Verificar vista de estudiante en el lobby
    await expect(page.getByText(/¡Estás dentro,/i)).toBeVisible();
    await expect(page.locator("span.accent-text")).toContainText("abc1234");
    await expect(page.getByText(/Esperando a que comience el cuestionario/i)).toBeVisible();
  });

  test("5b. Sala de espera - alumno recibe lista de participantes y redireccion a live via WS", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(["AlumnoOriginal"]),
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

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("userNickname", "AlumnoOriginal");

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
    await expect(page.getByText(/¡Estás dentro,/i)).toBeVisible();
    await expect(page.locator("span.stat-number")).toHaveText("1");

    // Inyectar actualización WS con nuevo participante
    await page.evaluate(() => {
      // @ts-ignore
      const ws = window.__mockWSInstances[0];
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: "participants_update",
            list: ["AlumnoOriginal", "NuevoCompañero"],
          }),
        });
      }
    });

    await expect(page.locator("span.stat-number")).toHaveText("2");
    await expect(page.getByText("NuevoCompañero")).toBeVisible();

    // Inyectar evento WS room_update notificando que la sala pasa a LIVE
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
});

test("5c. Sala de espera - redireccion automatica a lobby cuando el estado de la sala es waiting", async ({
    page,
  }) => {
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

    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");
    await page.waitForURL(/\/lobby\/10/);
  });


  test("5d. Sala de espera - manejo de fallos al sincronizar sala y UI de carga inicial", async ({
    page,
  }) => {
    // 1. Error 500 al sincronizar la sala
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Fallo de conexión" }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Sincronizando sala...")).toBeVisible();
  });

  test("5e. Sala de espera - vista de alumno y error al cargar participantes", async ({
    page,
  }) => {
    // 1. Lobby en vista de alumno (con userNickname)
    await page.route("**/stage/rooms/10/participants", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error" }),
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

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/lobby/10");
    // Error al cargar participants -> aun se muestra el lobby al alumno
    await expect(page.getByText(/Esperando a que comience/i)).toBeVisible();
    await expect(page.getByText(/Aún no hay nadie aquí/i)).toBeVisible();
  });
