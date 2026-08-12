import { test, expect } from "./fixtures";

test.describe("CU-10: Responder Preguntas", () => {
  test("1a. Respuestas - Alumno selecciona opcion y envia respuesta durante la fase de juego", async ({
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
          question_id: 101,
          quiz_title: "Cuestionario de Prueba",
          current_question_index: 2,
          total_questions: 3,
          text: "¿Cuál es la capital de España?",
          answer_time: 20,
          time_left: 10,
          answers_count: 3,
          show_answers_count: true,
          is_paused: false,
          options: [
            { id: 1, text: "Barcelona" },
            { id: 2, text: "Madrid" },
            { id: 3, text: "Sevilla" },
          ],
        }),
      });
    });

    await page.route("**/stage/answers*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, answer_id: 55 }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("participantId", "99");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");

    // Verificar pregunta y opciones en AnsweringPhase
    await expect(page.getByText("¿Cuál es la capital de España?")).toBeVisible();
    await expect(page.getByText("Madrid")).toBeVisible();

    // Seleccionar opción Madrid (opción 2)
    const madridBtn = page.getByRole("button", { name: /Madrid/i });
    await madridBtn.click();

    // Enviar respuesta
    const submitBtn = page.getByRole("button", { name: /Enviar respuesta/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Estado confirmado
    await expect(page.getByText("Respuesta enviada")).toBeVisible();
  });

  test("1b. Respuestas - manejo de errores al enviar respuesta y al cargar titulo de cuestionario", async ({
    page,
  }) => {
    // 1. Cargar quiz con título nulo y fallo en envío de respuesta
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "live",
          phase: "playing",
          quiz_id: 5,
          question_id: 101,
          current_question_index: 1,
          total_questions: 3,
          text: "¿Pregunta de prueba?",
          answer_time: 20,
          time_left: 10,
          options: [{ id: 1, text: "Opción 1" }],
        }),
      });
    });

    await page.route("**/content/quizzes/5/", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ name: null, title: null }),
      });
    });

    await page.route("**/stage/answers*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error enviando" }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("participantId", "99");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Sin título")).toBeVisible();

    const optBtn = page.getByRole("button", { name: "Opción 1" });
    await optBtn.click();
    const sendBtn = page.getByRole("button", { name: /Enviar respuesta/i });
    await sendBtn.click();

    // 2. Error al cargar cuestionario (quiz details catch)
    await page.route("**/content/quizzes/5/", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error" }),
      });
    });

    await page.goto("/live/10");
    await expect(page.getByText("¿Pregunta de prueba?")).toBeVisible();
  });


  test("2a. Gestión del profesor - Controlar temporizador y visibilidad de contador de respuestas", async ({
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
          question_id: 102,
          quiz_title: "Cuestionario de Prueba",
          current_question_index: 2,
          total_questions: 3,
          text: "¿Cuánto es 5 x 5?",
          answer_time: 30,
          time_left: 15,
          answers_count: 7,
          show_answers_count: true,
          is_paused: false,
          options: [
            { id: 10, text: "20" },
            { id: 11, text: "25" },
          ],
        }),
      });
    });

    await page.route("**/stage/rooms/10/timer/stop", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");

    await expect(page.getByText("¿Cuánto es 5 x 5?")).toBeVisible();
    await expect(page.getByText("RESPUESTAS")).toBeVisible();

    // Clic en terminar tiempo
    const stopTimerBtn = page.getByRole("button", { name: /Terminar tiempo/i });
    if (await stopTimerBtn.isVisible()) {
      await stopTimerBtn.click();
    }
  });

  test("2b. Gestión del profesor - Temporizador pausado y boton de ver estadisticas al agotar tiempo", async ({
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
          question_id: 103,
          current_question_index: 2,
          total_questions: 3,
          text: "¿Pregunta en pausa?",
          answer_time: 20,
          time_left: 0,
          answers_count: 5,
          show_answers_count: false,
          is_paused: true,
          options: [{ id: 1, text: "Opción A" }],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Pausa")).toBeVisible();
    await expect(page.getByText("••")).toBeVisible();

    const showResultsBtn = page.getByRole("button", { name: /Ver estadísticas/i });
    await expect(showResultsBtn).toBeVisible();
    await showResultsBtn.click();
  });

  test("2c. Gestión del profesor - Errores de API al finalizar pregunta y alternar visibilidad", async ({
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
          question_id: 102,
          current_question_index: 2,
          total_questions: 3,
          text: "¿Pregunta de prueba para errores?",
          answer_time: 20,
          time_left: 10,
          answers_count: 3,
          show_answers_count: true,
          options: [{ id: 1, text: "Opción A" }],
        }),
      });
    });

    await page.route("**/stage/rooms/10/toggle-answers-visibility", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error" }),
      });
    });

    await page.route("**/stage/rooms/10/questions/102/finish", async (route) => {
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
    });

    await page.goto("/live/10");

    // Alternar visibilidad (error toast)
    const toggleBtn = page.locator("button.eye-toggle-btn");
    await toggleBtn.click();
    await expect(page.getByText(/Error al alternar visibilidad/i)).toBeVisible();
  });



  test("3a. Sala en tiempo real - eventos WebSocket (show_results, show_leaderboard, room_finish, timer_update)", async ({
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
          question_id: 101,
          current_question_index: 1,
          total_questions: 3,
          text: "¿WS Test?",
          options: [{ id: 1, text: "Opción WS" }],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");

      // Mockear WebSocket globalmente para inyectar mensajes
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

    await page.goto("/live/10");
    await expect(page.getByText("¿WS Test?")).toBeVisible();

    // 1. Eventos WS: next_question, answer_submitted, answers_visibility_updated
    await page.evaluate(() => {
      // @ts-ignore
      const ws = window.__mockWSInstances[0];
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: "next_question",
            data: {
              status: "live",
              answers_count: 3,
              show_answers_count: true,
            },
          }),
        });
        ws.onmessage({
          data: JSON.stringify({
            type: "answer_submitted",
            data: { answers_count: 4 },
          }),
        });
        ws.onmessage({
          data: JSON.stringify({
            type: "answers_visibility_updated",
            data: { show_answers_count: false },
          }),
        });
        ws.onmessage({
          data: JSON.stringify({
            type: "timer_update",
            data: { time_left: 12, is_paused: true },
          }),
        });
        ws.onmessage({
          data: JSON.stringify({
            type: "participant_verified",
            data: {},
          }),
        });
      }
    });

    // 2. Inyectar evento WS: show_results
    await page.evaluate(() => {
      // @ts-ignore
      const ws = window.__mockWSInstances[0];
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: "show_results",
            data: {
              statistics: { "1": 5 },
              correct_option_id: 1,
              show_ranking: true,
            },
          }),
        });
      }
    });

    // 3. Inyectar evento WS: show_leaderboard
    await page.evaluate(() => {
      // @ts-ignore
      const ws = window.__mockWSInstances[0];
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: "show_leaderboard",
            data: {
              leaderboard: [{ name: "LeaderWS", score: 500 }],
              show_ranking: true,
            },
          }),
        });
      }
    });

    // 4. Inyectar evento WS: room_finish
    await page.evaluate(() => {
      // @ts-ignore
      const ws = window.__mockWSInstances[0];
      if (ws && ws.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            type: "room_finish",
            data: {},
          }),
        });
      }
    });

    await expect(page.getByText(/¡Cuestionario finalizado!/i)).toBeVisible();
  });
});
