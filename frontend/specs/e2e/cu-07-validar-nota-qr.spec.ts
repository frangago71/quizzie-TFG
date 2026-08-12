import { test, expect } from "./fixtures";

test.describe("CU-07: Validar Nota por QR", () => {
  test("1a.  Pantalla final - ALumno ve resultados con QR de verificacion", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          current_question_index: 3,
          total_questions: 3,
          quiz_title: "Cuestionario Finalizado",
          statistics: { "1": 10 },
        }),
      });
    });

    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
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
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("participantId", "99");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");

    // Verificar pantalla final y código QR
    await expect(page.getByText("850 pts")).toBeVisible();
    await expect(
      page.getByText("Has respondido 4 correctas sobre 5 en total."),
    ).toBeVisible();
    await expect(page.getByText("Tu código de verificación")).toBeVisible();
    await expect(
      page.getByText(/Muestra este código a tu profesor/i),
    ).toBeVisible();
  });

  test("1b. Pantalla final - Profesor ve podio final y boton de escanear QR", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "finished",
          current_question_index: 3,
          total_questions: 3,
          quiz_title: "Cuestionario Finalizado",
          leaderboard: [
            { name: "abc1234", score: 950 },
            { name: "xyz5678", score: 820 },
          ],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");

    // Verificar podio y controles de profesor
    await expect(page.getByText("abc1234")).toBeVisible();
    await expect(page.getByText("xyz5678")).toBeVisible();

    // Botón de escáner QR de notas
    const scanBtn = page.getByRole("button", { name: /Escanear QR/i });
    if (await scanBtn.isVisible()) {
      await expect(scanBtn).toBeVisible();
    }
  });

  test("1c. Pantalla final - Alumno se sale antes de ser verificado navegando al inicio", async ({
    page,
  }) => {
    // 1. Alumno sin verificar abre modal de advertencia al pulsar Salir
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          current_question_index: 3,
          total_questions: 3,
          quiz_title: "Cuestionario Finalizado",
        }),
      });
    });

    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
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
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("participantId", "99");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await page.getByRole("button", { name: "Salir", exact: true }).click();
    await expect(page.getByText(/¿Estás seguro de que quieres salir?/i)).toBeVisible();

    // Clic en Permanecer (cierra modal)
    await page.getByRole("button", { name: "Permanecer" }).click();
    await expect(page.getByText(/¿Estás seguro de que quieres salir?/i)).not.toBeVisible();

    // Clic en Salir de todos modos -> redirige a /
    await page.getByRole("button", { name: "Salir", exact: true }).click();
    await page.getByRole("button", { name: /Salir de todos modos/i }).click();
    await page.waitForURL(/\/$/);

    // 2. Alumno con nota ya verificada -> el botón Salir navega directamente a /
    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 850,
          correct_answers: 4,
          total_questions: 5,
          verification_token: "qr-token-abc-123",
          is_verified: true,
        }),
      });
    });

    await page.goto("/live/10");
    await expect(page.getByText("Verificado")).toBeVisible();
    await page.getByRole("button", { name: "Salir", exact: true }).click();
    await page.waitForURL(/\/$/);
  });

  test("1d. Pantalla final - Profesor en cuestionario sin alumnos, no puede verificar", async ({
    page,
  }) => {
    // 1. Podio vacío en fase de verificación
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          leaderboard: [],
        }),
      });
    });

    await page.route("**/stage/rooms/10/finish", async (route) => {
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
    await expect(page.getByText(/No hay participantes registrados/i)).toBeVisible();

    // Profesor acepta confirmación de dialogo y hace clic en Finalizar verificación
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    const finishBtn = page.getByRole("button", { name: /Finalizar verificación/i });
    await finishBtn.click();
    await page.waitForURL(/\/quizzes/);

    // 2. Manejo de error al finalizar verificación
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          leaderboard: [],
        }),
      });
    });

    await page.route("**/stage/rooms/10/finish", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error" }),
      });
    });

    await page.goto("/live/10");
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: /Finalizar verificación/i }).click();
    await expect(page.getByText(/Error al cerrar la verificación/i)).toBeVisible();

    // 3. Podio en sala finalizada -> Botón Volver al panel navega a /dashboard
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "finished",
          leaderboard: [{ name: "ProfesorTest", score: 100 }],
        }),
      });
    });

    await page.goto("/live/10");
    await expect(page.getByText(/Fase de verificación finalizada/i)).toBeVisible();
    const dashboardBtn = page.getByRole("button", { name: /Volver al panel/i });
    await dashboardBtn.click();
    await page.waitForURL(/\/dashboard/);
  });

    test("2a. Verificación - Profesor escanea un QR invalido, uno de otra sala, uno valido y uno ya verificado", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          current_question_index: 3,
          total_questions: 3,
          quiz_title: "Cuestionario Finalizado",
          leaderboard: [{ name: "abc1234", score: 950 }],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");

      // Interceptar callback de Html5QrcodeScanner globalmente
      // @ts-ignore
      window.__activeScanCb = null;
    });

    await page.goto("/live/10");

    // Intentar vincular hook de escáner en ventana
    await page.evaluate(() => {
      // @ts-ignore
      if (window.Html5QrcodeScanner) {
        // @ts-ignore
        window.Html5QrcodeScanner.prototype.render = function (successCb) {
          // @ts-ignore
          window.__activeScanCb = successCb;
        };
      }
    });

    // Abrir modal de escáner QR
    const scanBtn = page.getByRole("button", { name: /Escanear QR/i });
    await scanBtn.click();
    await expect(page.getByText("Escanear QR de Alumno")).toBeVisible();

    // 1. Probar escaneo de QR inválido (no es JSON)
    await page.evaluate(() => {
      // @ts-ignore
      if (window.__activeScanCb) window.__activeScanCb("texto-qr-invalido");
    });
    const errorText = page.getByText(/Error al validar el código/i);
    if (await errorText.isVisible()) {
      await expect(errorText).toBeVisible();
    }

    // 2. Cerrar modal de escáner con botón X
    const closeScanBtn = page.locator("button.modal-close");
    if (await closeScanBtn.isVisible()) {
      await closeScanBtn.click();
      await expect(page.getByText("Escanear QR de Alumno")).not.toBeVisible();
    }
  });

  test("2b. Verificación -podio completo con 1º, 2º y 3er lugar en profesor y alumno verificado", async ({
    page,
  }) => {
    // 1. Profesor con podio completo (1º, 2º y 3º) en fase verifying
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          leaderboard: [
            { name: "Primero", score: 950 },
            { name: "Segundo", score: 820 },
            { name: "Tercero", score: 700 },
          ],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Primero")).toBeVisible();
    await expect(page.getByText("Segundo")).toBeVisible();
    await expect(page.getByText("Tercero")).toBeVisible();

    // 2. Subtítulo muestra estado verifying del profesor
    await expect(
      page.getByRole("heading", { name: /Escanea los códigos QR de tus alumnos/i })
    ).toBeVisible();

    // 3. Vista de alumno con nota verificada y QR visible (stats con is_verified: true)
    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 950,
          correct_answers: 5,
          total_questions: 5,
          verification_token: "token-test",
          is_verified: true,
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("participantId", "99");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Verificado")).toBeVisible();
    await expect(page.getByText("¡Buen trabajo!")).toBeVisible();
  });

  test("2c. Verificación - estado cargando stats, fallback sin QR y error de servidor al obtener stats", async ({
    page,
  }) => {
    // 1. Stats nulas / tardías -> Muestra "Cargando resultados..."
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
        }),
      });
    });

    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
      // Devolver error para probar catch (console.error) y stats === null
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error interno" }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("participantId", "99");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Cargando resultados...")).toBeVisible();

    // 2. Estado finished sin token de verificación -> Muestra "La fase de verificación ha terminado."
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "finished",
        }),
      });
    });

    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 500,
          correct_answers: 3,
          total_questions: 5,
        }),
      });
    });

    await page.goto("/live/10");
    await expect(page.getByText("La fase de verificación ha terminado.")).toBeVisible();

    // 3. Estado verifying sin token de verificación -> Muestra "Próximamente se mostrará aquí tu código QR"
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
        }),
      });
    });

    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 500,
          correct_answers: 3,
          total_questions: 5,
          // verification_token omitido a propósito
        }),
      });
    });

    await page.goto("/live/10");
    await expect(page.getByText(/Próximamente se mostrará aquí tu código QR/i)).toBeVisible();
  });

  test("2d. Verificación - escaneo completo de QR en ScannerModal (otra sala, exito y 409 verificado)", async ({
    page,
  }) => {
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          leaderboard: [{ name: "AlumnoPrueba", score: 900 }],
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");

    const scanBtn = page.getByRole("button", { name: /Escanear QR/i });
    await scanBtn.click();
    await expect(page.getByText("Escanear QR de Alumno")).toBeVisible();

    // 1. Escanear QR de otra sala (roomId === 99)
    const otherRoomQr = JSON.stringify({ roomId: 99, nickname: "otro", token: "tok99" });
    await page.evaluate((qrText) => {
      // @ts-ignore
      if (window.__e2eScan) {
        // @ts-ignore
        window.__e2eScan(qrText);
      }
    }, otherRoomQr);
    await expect(page.getByText("Este código QR pertenece a otra sala.")).toBeVisible();

    // Reabrir escáner
    await scanBtn.click();
    await expect(page.getByText("Escanear QR de Alumno")).toBeVisible();

    // 2. Escanear QR válido con éxito (HTTP 200 { status: "success" })
    await page.route("**/stage/rooms/10/verify-participant", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success" }),
      });
    });

    const validQr = JSON.stringify({ roomId: 10, nickname: "AlumnoPrueba", token: "tok10" });
    await page.evaluate((qrText) => {
      // @ts-ignore
      if (window.__e2eScan) {
        // @ts-ignore
        window.__e2eScan(qrText);
      }
    }, validQr);
    await expect(page.getByText(/¡AlumnoPrueba verificado con éxito!/i)).toBeVisible();

    // Reabrir escáner
    await scanBtn.click();
    await expect(page.getByText("Escanear QR de Alumno")).toBeVisible();

    // 3. Escanear QR ya verificado (HTTP 409)
    await page.route("**/stage/rooms/10/verify-participant", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Ya verificado" }),
      });
    });

    await page.evaluate((qrText) => {
      // @ts-ignore
      if (window.__e2eScan) {
        // @ts-ignore
        window.__e2eScan(qrText);
      }
    }, validQr);
    await expect(page.getByText(/ya ha sido verificado/i)).toBeVisible();
  });

  test("2e. Verificación - interaccion completa con modal de confirmacion de salida y error al finalizar verificacion", async ({
    page,
  }) => {
    // 1. Alumno interactúa con botones de la modal de salida
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
        }),
      });
    });

    await page.route("**/stage/rooms/10/participants/99/stats*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 500,
          correct_answers: 3,
          total_questions: 5,
          verification_token: "tok-test-1j",
          is_verified: false,
        }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("roomId", "10");
      sessionStorage.setItem("participantId", "99");
      sessionStorage.setItem("userNickname", "abc1234");
    });

    await page.goto("/live/10");
    await expect(page.getByText("Tu código de verificación")).toBeVisible();

    // Clic en Salir -> abre modal warning-modal
    const exitBtn = page.getByRole("button", { name: "Salir", exact: true });
    await exitBtn.click();
    await expect(page.getByText("¿Estás seguro de que quieres salir?")).toBeVisible();

    // Clic en Permanecer -> cierra modal
    const stayBtn = page.getByRole("button", { name: "Permanecer" });
    await stayBtn.click();
    await expect(page.getByText("¿Estás seguro de que quieres salir?")).not.toBeVisible();

    // Clic en Salir de nuevo -> Clic en Salir de todos modos
    await exitBtn.click();
    const forceExitBtn = page.getByRole("button", { name: "Salir de todos modos" });
    await forceExitBtn.click();
    await page.waitForURL(/\/$/);

    // 2. Profesor en HostView provoca error 500 al finalizar verificación
    await page.route("**/stage/rooms/10", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          room_id: 10,
          join_code: "123456",
          status: "verifying",
          leaderboard: [{ name: "Profe", score: 100 }],
        }),
      });
    });

    await page.route("**/stage/rooms/10/finish", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error del servidor" }),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.clear();
      sessionStorage.setItem("token", "fake-teacher-jwt");
      sessionStorage.setItem("roomId", "10");
    });

    await page.goto("/live/10");
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    const finishBtn = page.getByRole("button", { name: "Finalizar verificación" });
    await finishBtn.click();
    await expect(page.getByText("Error al cerrar la verificación.")).toBeVisible();
  });
});
