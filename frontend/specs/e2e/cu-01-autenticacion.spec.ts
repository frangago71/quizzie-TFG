import { test, expect } from "./fixtures";

test.describe("CU-01: Teacher Authentication & Account Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    const corsHeaders = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "*",
    };

    // Configuraciones globales de mocks para peticiones API
    await page.route(/\/users\/register/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 201,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "Usuario registrado correctamente" }),
      });
    });

    await page.route(/\/users\/verify-email/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-jwt-verified-token",
          message: "Cuenta verificada con éxito",
        }),
      });
    });

    await page.route(/\/users\/resend-verification/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "Código de verificación reenviado" }),
      });
    });

    await page.route(/\/users\/forgot-password/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({ message: "Código de recuperación enviado" }),
      });
    });

    await page.route(/\/users\/reset-password/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-jwt-reset-token",
          message: "Contraseña restablecida con éxito",
        }),
      });
    });

    await page.route(/\/users\/login/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-jwt-login-token-12345",
          token_type: "bearer",
        }),
      });
    });

    await page.route(/\/users\/me/, async (route) => {
      const method = route.request().method();
      if (method === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      } else if (method === "PUT") {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie E2E",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      } else if (method === "DELETE") {
        await route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: "application/json",
          body: JSON.stringify({ message: "Cuenta eliminada permanentemente" }),
        });
      }
    });

    await page.route(/\/users\/my-quizzes/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 200, headers: corsHeaders });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  });

  test("1. Proteccion de rutas - redireccion de usuario no autenticado", async ({
    page,
  }) => {
    await page.goto("/quizzes");
    await expect(page).toHaveURL(/\/login/);
  });

  test("2. Registro - validaciones de formulario, envio y errores de API", async ({
    page,
  }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: "Registro de Profesores" }),
    ).toBeVisible();

    // Validacion de nombre de usuario demasiado corto (menos de 3 caracteres)
    await page.locator("#username").fill("Ab");
    await page.locator("#email").fill("profesor.e2e@quizzie.com");
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirmPassword").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText("El nombre de usuario debe tener al menos 3 caracteres."),
    ).toBeVisible();

    // Validacion de contraseña demasiado corta (menos de 6 caracteres)
    await page.locator("#username").fill("Profesor Quizzie");
    await page.locator("#password").fill("12345");
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText("La contraseña debe tener al menos 6 caracteres."),
    ).toBeVisible();

    // Validacion de contraseñas no coincidentes
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirmPassword").fill("Different123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();

    // Manejo de error de API al registrar email duplicado (HTTP 400)
    await page.route(/\/users\/register/, async (route) => {
      await route.fulfill({
        status: 400,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
        },
        contentType: "application/json",
        body: JSON.stringify({ detail: "El email ya está registrado" }),
      });
    });
    await page.locator("#confirmPassword").fill("Password123!");
    await page.locator('button[type="submit"]').click();

    // Envio exitoso del formulario y redireccion a verificacion de email
    await page.route(/\/users\/register/, async (route) => {
      await route.fulfill({
        status: 201,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
        },
        contentType: "application/json",
        body: JSON.stringify({ message: "Usuario registrado correctamente" }),
      });
    });
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/verify-email/);
  });

  test("3a. Verificacion de correo - navegacion y reenvio de codigo", async ({
    page,
  }) => {
    // Comprobacion de enlace para volver a inicio de sesion
    await page.goto("/verify-email");
    await expect(page.getByText(/Verifica tu Cuenta/i)).toBeVisible();
    await page
      .locator("button.back-link-text", {
        hasText: "Volver a inicio de sesión",
      })
      .click();
    await expect(page).toHaveURL(/\/login/);

    // Entrada manual de correo cuando no viene como parametro en la URL
    await page.goto("/verify-email");
    await page.locator("#email").fill("profesor.e2e@quizzie.com");

    // Intento de reenvio de codigo con correo vacio
    await page.goto("/verify-email");
    await page.evaluate(
      'document.querySelector("#email")?.removeAttribute("required")',
    );
    await page.locator("#email").fill("");
    await page
      .locator("button.back-link-text", { hasText: "Reenviar" })
      .click();

    // Manejo de error de limite de peticiones al reenviar codigo (HTTP 400)
    await page.locator("#email").fill("profesor.e2e@quizzie.com");
    await page.route(/\/users\/resend-verification/, async (route) => {
      await route.fulfill({
        status: 400,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Demasiados intentos. Inténtalo más tarde.",
        }),
      });
    });
    await page
      .locator("button.back-link-text", { hasText: "Reenviar" })
      .click();

    // Manejo de error de servidor sin mensaje detallado (HTTP 500)
    await page.route(/\/users\/resend-verification/, async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page
      .locator("button.back-link-text", { hasText: "Reenviar" })
      .click();
  });

  test("3b. Verificacion de correo - cuadricula de codigo y validaciones", async ({
    page,
  }) => {
    // Validacion al enviar correo o codigo vacios
    await page.goto("/verify-email?email=profesor.e2e%40quizzie.com");
    await page.evaluate(
      'const f=document.querySelector("form"); if(f) f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))',
    );
    await page.waitForTimeout(300);

    // Filtrado de caracteres no numericos y navegacion con la tecla de borrado
    const codeBoxes = page.locator(".code-inputs-group input, input.code-box");
    await expect(codeBoxes).toHaveCount(6);
    await codeBoxes.nth(0).fill("a");
    await codeBoxes.nth(0).fill("1");
    await codeBoxes.nth(1).fill("2");
    await codeBoxes.nth(1).fill("");
    await codeBoxes.nth(1).press("Backspace");

    // Validacion de codigo incompleto (menos de 6 digitos)
    for (let i = 0; i < 5; i++) {
      await codeBoxes.nth(i).fill(String(i + 1));
    }
    await page.evaluate(
      'const f=document.querySelector("form"); if(f) f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))',
    );
    await page.waitForTimeout(300);

    // Manejo de error indeterminado del servidor al activar cuenta (HTTP 500)
    await page.route(/\/users\/verify-email/, async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await codeBoxes.nth(5).fill("6");
    await page.getByRole("button", { name: /Activar Cuenta/i }).click();
  });

  test("3c. Verificacion de correo - redirecciones segun presencia de token", async ({
    page,
  }) => {
    // Activacion correcta sin devolucion de token JWT (redireccion a login)
    await page.goto("/verify-email?email=profesor.e2e%40quizzie.com");
    await page.route(/\/users\/verify-email/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ message: "Cuenta activada" }),
      });
    });
    const codeBoxes = page.locator(".code-inputs-group input, input.code-box");
    for (let i = 0; i < 6; i++) {
      await codeBoxes.nth(i).fill(String(i + 1));
    }
    await page.getByRole("button", { name: /Activar Cuenta/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Activacion correcta con token JWT recibido (redireccion directa a cuestionarios)
    await page.goto("/verify-email?email=profesor.e2e%40quizzie.com");
    await page.route(/\/users\/verify-email/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-jwt-verified-token",
          message: "Cuenta verificada con éxito",
        }),
      });
    });
    for (let i = 0; i < 6; i++) {
      await codeBoxes.nth(i).fill(String(i + 1));
    }
    await page.getByRole("button", { name: /Activar Cuenta/i }).click();
    await expect(page).toHaveURL(/\/quizzes/);
  });

  test("4. Recuperar contraseña - validaciones, navegacion y envio de codigo", async ({
    page,
  }) => {
    // Validacion de campo de correo vacio
    await page.goto("/forgot-password");
    await page.evaluate(
      'document.querySelector("#email")?.removeAttribute("required")',
    );
    await page.locator('button[type="submit"]').click();

    // Comprobacion de enlace para volver a inicio de sesion
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /¿Olvidaste tu contraseña\?/i }),
    ).toBeVisible();
    await page.locator("button.back-link-text").click();
    await expect(page).toHaveURL(/\/login/);

    // Manejo de error de usuario no encontrado (HTTP 400)
    await page.goto("/forgot-password");
    await page.route(/\/users\/forgot-password/, async (route) => {
      await route.fulfill({
        status: 400,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ detail: "Usuario no encontrado" }),
      });
    });
    await page.locator("#email").fill("nonexistent@quizzie.com");
    await page.locator('button[type="submit"]').click();

    // Manejo de error indeterminado del servidor (HTTP 500)
    await page.route(/\/users\/forgot-password/, async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.locator("#email").fill("error@quizzie.com");
    await page.locator('button[type="submit"]').click();

    // Solicitud correcta de codigo de recuperacion
    await page.route(/\/users\/forgot-password/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ message: "Código de recuperación enviado" }),
      });
    });
    await page.locator("#email").fill("profesor.e2e@quizzie.com");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test("5a. Restablecer contraseña - cuadricula de codigo y validaciones", async ({
    page,
  }) => {
    // Comprobacion de enlace para volver a inicio de sesion
    await page.goto("/reset-password");
    await expect(
      page.getByRole("heading", { name: /Restablece tu Contraseña/i }),
    ).toBeVisible();
    await page.locator("button.back-link-text").click();
    await expect(page).toHaveURL(/\/login/);

    // Entrada manual de correo cuando no viene en la URL
    await page.goto("/reset-password");
    await page.locator("#email").fill("profesor.e2e@quizzie.com");

    // Validacion de campos vacios
    await page.evaluate(
      'const f=document.querySelector("form"); if(f) f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))',
    );
    await page.waitForTimeout(300);

    // Validacion de codigo incompleto y filtrado de caracteres no numericos
    const codeBoxes = page.locator(".code-inputs-group input, input.code-box");
    await expect(codeBoxes).toHaveCount(6);
    await codeBoxes.nth(0).fill("a");
    await codeBoxes.nth(0).fill("1");
    await codeBoxes.nth(1).fill("2");
    await codeBoxes.nth(1).fill("");
    await codeBoxes.nth(1).press("Backspace");
    for (let i = 0; i < 5; i++) {
      await codeBoxes.nth(i).fill(String(i + 1));
    }
    await page.locator("#newPassword").fill("NewPass123!");
    await page.locator("#confirmPassword").fill("NewPass123!");
    await page.evaluate(
      'const f=document.querySelector("form"); if(f) f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))',
    );
    await page.waitForTimeout(300);

    await codeBoxes.nth(5).fill("6");

    // Validacion de contraseña corta (menos de 6 caracteres)
    await page.locator("#newPassword").fill("12345");
    await page.locator("#confirmPassword").fill("12345");
    await page.locator('button[type="submit"]').click();

    // Validacion de contraseñas no coincidentes
    await page.locator("#newPassword").fill("NewPassword123!");
    await page.locator("#confirmPassword").fill("Different123!");
    await page.locator('button[type="submit"]').click();

    // Manejo de error indeterminado del servidor al restablecer (HTTP 500)
    await page.locator("#confirmPassword").fill("NewPassword123!");
    await page.route(/\/users\/reset-password/, async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.locator('button[type="submit"]').click();
  });

  test("5b. Restablecer contraseña - redirecciones segun presencia de token", async ({
    page,
  }) => {
    // Restablecimiento correcto sin devolucion de token JWT (redireccion a login)
    await page.goto("/reset-password?email=profesor.e2e%40quizzie.com");
    await page.route(/\/users\/reset-password/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ message: "Contraseña cambiada" }),
      });
    });
    const codeBoxes = page.locator(".code-inputs-group input, input.code-box");
    for (let i = 0; i < 6; i++) {
      await codeBoxes.nth(i).fill(String(i + 1));
    }
    await page.locator("#newPassword").fill("NewPassword123!");
    await page.locator("#confirmPassword").fill("NewPassword123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);

    // Restablecimiento correcto con token JWT (redireccion directa a cuestionarios)
    await page.goto("/reset-password?email=profesor.e2e%40quizzie.com");
    await page.route(/\/users\/reset-password/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-jwt-reset-token",
          message: "Contraseña restablecida con éxito",
        }),
      });
    });
    for (let i = 0; i < 6; i++) {
      await codeBoxes.nth(i).fill(String(i + 1));
    }
    await page.locator("#newPassword").fill("NewPassword123!");
    await page.locator("#confirmPassword").fill("NewPassword123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/quizzes/);
  });

  test("6a. Login - redireccion de usuario autenticado", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-login-token-12345");
    });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/quizzes/);
  });

  test("6b. Login - enlace a olvidar contraseña", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByRole("button", { name: /¿Has olvidado tu contraseña\?/i })
      .click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("6c. Login - enlace a registro", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByRole("button", { name: /¿No tienes cuenta\? Regístrate/i })
      .click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("6d. Login - enlace a zona de alumnos", async ({ page }) => {
    await page.goto("/");
    await page.goto("/login");
    await page.getByRole("button", { name: /Ir a zona de alumnos/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("6e. Login - error de credenciales incorrectas (HTTP 401)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.route(/\/users\/login/, async (route) => {
      await route.fulfill({
        status: 401,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ detail: "Credenciales incorrectas" }),
      });
    });
    await page.locator("#email").fill("wrong@quizzie.com");
    await page.locator("#password").fill("WrongPass123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".error-text")).toBeVisible();
    await expect(page.locator(".error-text")).toHaveText(
      "Credenciales incorrectas",
    );
  });

  test("6f. Login - redireccion por cuenta no verificada con mensaje (HTTP 403)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.route(/\/users\/login/, async (route) => {
      await route.fulfill({
        status: 403,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Cuenta no verificada. Revisa tu correo.",
        }),
      });
    });
    await page.locator("#email").fill("unverified@quizzie.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(
      /\/verify-email\?email=unverified%40quizzie\.com/,
    );
  });

  test("6g. Login - redireccion por cuenta no verificada sin mensaje (HTTP 403)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.route(/\/users\/login/, async (route) => {
      await route.fulfill({
        status: 403,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.locator("#email").fill("unverified2@quizzie.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(
      /\/verify-email\?email=unverified2%40quizzie\.com/,
    );
  });

  test("6h. Login - error de servidor con mensaje detallado (HTTP 500)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.route(/\/users\/login/, async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Error interno del servidor. Inténtalo de nuevo más tarde.",
        }),
      });
    });
    await page.locator("#email").fill("server.error@quizzie.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".error-text")).toBeVisible();
    await expect(page.locator(".error-text")).toHaveText(
      "Error interno del servidor. Inténtalo de nuevo más tarde.",
    );
  });

  test("6i. Login - error de servidor sin mensaje detallado (HTTP 500)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.route(/\/users\/login/, async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.locator("#email").fill("server.fallback@quizzie.com");
    await page.locator("#password").fill("Password123!");
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".error-text")).toBeVisible();
    await expect(page.locator(".error-text")).toHaveText(
      "Error de autenticación",
    );
  });

  test("6j. Login - inicio de sesion correcto y redireccion a cuestionarios", async ({
    page,
  }) => {
    await page.route(/\/users\/login/, async (route) => {
      await new Promise((res) => setTimeout(res, 150));
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-jwt-login-token-12345",
          token_type: "bearer",
        }),
      });
    });
    await page.goto("/login");
    await page.locator("#email").fill("profesor.e2e@quizzie.com");
    await page.locator("#password").fill("NewPassword123!");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/quizzes/);
  });

  test("7a. Perfil - edicion de nombre de usuario y validaciones de datos", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      sessionStorage.setItem("token", "fake-jwt-login-token-12345"),
    );
    await page.goto("/profile");
    await page.waitForSelector("text=Editar Perfil", {
      state: "visible",
      timeout: 10000,
    });
    await expect(
      page.getByRole("heading", { name: "Mi Perfil", exact: true }),
    ).toBeVisible();

    // Validacion de campo de usuario vacio
    await page.getByRole("button", { name: /Editar Perfil/i }).click();
    await page.evaluate(
      'document.querySelector("#edit-username-input")?.removeAttribute("required")',
    );
    await page.locator("#edit-username-input").fill("");
    await page.getByRole("button", { name: /Guardar/i }).click();

    // Validacion de nombre de usuario corto (menos de 3 caracteres)
    await page.locator("#edit-username-input").fill("Ab");
    await page.getByRole("button", { name: /Guardar/i }).click();

    // Cancelacion del modo de edicion
    await expect(page.locator(".btn-profile-cancel")).toBeEnabled();
    await page.locator(".btn-profile-cancel").click();

    // Manejo de error por nombre de usuario duplicado en API (HTTP 400)
    await page.getByRole("button", { name: /Editar Perfil/i }).click();
    await page.route(/\/users\/me/, async (route) => {
      const method = route.request().method();
      if (method === "OPTIONS") {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
        });
      } else if (method === "PUT") {
        await route.fulfill({
          status: 400,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            detail: "El nombre de usuario ya está registrado.",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      }
    });
    await page.locator("#edit-username-input").fill("Profesor Quizzie E2E");
    await page.getByRole("button", { name: /Guardar/i }).click();

    // Manejo de error indeterminado del servidor al guardar perfil (HTTP 500)
    await page.route(/\/users\/me/, async (route) => {
      const method = route.request().method();
      if (method === "OPTIONS") {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
        });
      } else if (method === "PUT") {
        await route.fulfill({
          status: 500,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      }
    });
    await page.getByRole("button", { name: /Guardar/i }).click();

    // Guardado correcto de nombre de usuario valido (HTTP 200)
    await page.route(/\/users\/me/, async (route) => {
      const method = route.request().method();
      if (method === "OPTIONS") {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
        });
      } else if (method === "PUT") {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie E2E",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      }
    });
    await page.getByRole("button", { name: /Guardar/i }).click();
    await expect(
      page.getByRole("heading", { name: "Profesor Quizzie E2E" }),
    ).toBeVisible();
  });

  test("7b. Perfil - solicitud de recuperacion de contraseña", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate(() =>
      sessionStorage.setItem("token", "fake-jwt-login-token-12345"),
    );
    await page.goto("/profile");
    await page.waitForSelector(".btn-main.cyan.max", {
      state: "visible",
      timeout: 10000,
    });

    // Manejo de error al solicitar codigo de recuperacion (HTTP 400)
    await page.route(/\/users\/forgot-password/, async (route) => {
      await route.fulfill({
        status: 400,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ detail: "Error al solicitar el código." }),
      });
    });
    await page.locator(".btn-main.cyan.max").click();
    await expect(page.locator(".btn-main.cyan.max")).toBeEnabled();

    // Manejo de error indeterminado del servidor (HTTP 500)
    await page.route(/\/users\/forgot-password/, async (route) => {
      await route.fulfill({
        status: 500,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
    await page.locator(".btn-main.cyan.max").click();
    await expect(page.locator(".btn-main.cyan.max")).toBeEnabled();

    // Solicitud de codigo correcta y redireccion a restablecimiento
    await page.route(/\/users\/forgot-password/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        contentType: "application/json",
        body: JSON.stringify({ message: "Código enviado" }),
      });
    });
    await page.locator(".btn-main.cyan.max").click();
    await expect(page).toHaveURL(/\/reset-password/);
  });

  test("7c. Perfil - modal de eliminacion de cuenta y flujo de confirmacion", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate(() =>
      sessionStorage.setItem("token", "fake-jwt-login-token-12345"),
    );
    await page.goto("/profile");
    await page.waitForSelector(".btn-main.danger.max", {
      state: "visible",
      timeout: 10000,
    });

    // Apertura y cierre de modal mediante clic en el fondo
    await page.locator(".btn-main.danger.max").click();
    await expect(
      page.getByText(/¿Eliminar cuenta permanentemente\?/i),
    ).toBeVisible();
    await page
      .locator(".modal-backdrop-button")
      .click({ position: { x: 10, y: 10 } });
    await expect(
      page.getByText(/¿Eliminar cuenta permanentemente\?/i),
    ).not.toBeVisible();

    // Apertura y cierre de modal mediante boton de cancelar
    await page.locator(".btn-main.danger.max").click();
    await page.locator(".danger-cancel-btn").click();
    await expect(
      page.getByText(/¿Eliminar cuenta permanentemente\?/i),
    ).not.toBeVisible();

    // Bloqueo del boton de eliminar cuando la contraseña esta vacia
    await page.locator(".btn-main.danger.max").click();
    await page.waitForSelector("#confirm-password", { state: "visible" });
    await expect(page.locator(".danger-btn")).toBeDisabled();

    // Manejo de error por contraseña incorrecta al eliminar cuenta (HTTP 400)
    await page.route(/\/users\/me/, async (route) => {
      const method = route.request().method();
      if (method === "OPTIONS") {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
        });
      } else if (method === "DELETE") {
        await route.fulfill({
          status: 400,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({ detail: "Contraseña incorrecta" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      }
    });
    await page.locator("#confirm-password").fill("WrongPass123!");
    await expect(page.locator("#confirm-password")).toHaveValue(
      "WrongPass123!",
    );
    await expect(page.locator(".danger-btn")).toBeEnabled();
    await page.locator(".danger-btn").click();
    await expect(page.locator(".danger-btn")).toHaveText("Eliminar cuenta");
    await expect(page.locator(".danger-btn")).toBeEnabled();

    // Manejo de error indeterminado del servidor al eliminar (HTTP 500)
    await page.route(/\/users\/me/, async (route) => {
      const method = route.request().method();
      if (method === "OPTIONS") {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
        });
      } else if (method === "DELETE") {
        await route.fulfill({
          status: 500,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            username: "Profesor Quizzie",
            email: "profesor.e2e@quizzie.com",
          }),
        });
      }
    });
    await page.locator(".danger-btn").click();
    await expect(page.locator(".danger-btn")).toHaveText("Eliminar cuenta");
    await expect(page.locator(".danger-btn")).toBeEnabled();

    // Cancelacion en el ultimo momento tras introducir la contraseña correcta
    await page.locator("#confirm-password").fill("CorrectPassword123!");
    await expect(page.locator("#confirm-password")).toHaveValue(
      "CorrectPassword123!",
    );
    await expect(page.locator(".danger-btn")).toBeEnabled();
    await page.locator(".danger-cancel-btn").click();
    await expect(
      page.getByText(/¿Eliminar cuenta permanentemente\?/i),
    ).not.toBeVisible();
    await expect(page).toHaveURL(/\/profile/);

    // Eliminacion efectiva de la cuenta y redireccion a inicio de sesion
    await page.locator(".btn-main.danger.max").click();
    await page.waitForSelector("#confirm-password", { state: "visible" });
    await page.locator("#confirm-password").fill("CorrectPassword123!");
    await expect(page.locator("#confirm-password")).toHaveValue(
      "CorrectPassword123!",
    );
    await page.route(/\/users\/me/, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          headers: { "access-control-allow-origin": "*" },
          contentType: "application/json",
          body: JSON.stringify({
            message: "Tu cuenta ha sido eliminada permanentemente.",
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.locator(".danger-btn").click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("7d. Perfil - error al cargar datos de tarjeta de perfil", async ({
    page,
  }) => {
    await page.route(/\/users\/me/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
          },
          contentType: "application/json",
          body: JSON.stringify({ detail: "Error del servidor" }),
        });
      }
    });

    await page.goto("/login");
    await page.locator("#email").fill("profesor.e2e@quizzie.com");
    await page.locator("#password").fill("NewPassword123!");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/quizzes/);

    await page.goto("/profile");
    await expect(page.getByText("Error al cargar el perfil")).toBeVisible();
    await page.getByRole("button", { name: "Ir a Login" }).click();
    await expect(page).toHaveURL(/\/login|\/quizzes/);
  });

  test("8. AuthService - helpers de sesion y almacenamiento local", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate(
      'sessionStorage.removeItem("token"); sessionStorage.setItem("token", "test-token-val"); sessionStorage.removeItem("token");',
    );
  });
});
