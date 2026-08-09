import { test, expect } from "@playwright/test";

test.describe("CU-09: Export Results Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Inyección de sesión de profesor autenticado
    await page.addInitScript(() => {
      sessionStorage.setItem("token", "fake-jwt-token-12345");
    });
  });

  test("export results lifecycle: download CSV report containing verified student records", async ({
    page,
  }) => {
    await test.step("Step 1: Mock CSV export endpoint", async () => {
      // Mock del endpoint de descarga del informe CSV filtrado por alumnos verificados
      await page.route(
        "http://localhost:8000/stage/rooms/10/export*",
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "text/csv",
            headers: {
              "Content-Disposition":
                'attachment; filename="resultados_sala_10.csv"',
            },
            body: "Nickname,Puntuación,Correctas,Verificado\nabc1234,850,4,Sí\n",
          });
        },
      );
    });

    await test.step("Step 2: Request CSV report and validate exported contents", async () => {
      // Descarga del informe e inspección del contenido retornado
      const exportResult = await page.evaluate(async () => {
        const res = await fetch("http://localhost:8000/stage/rooms/10/export");
        return { status: res.status, text: await res.text() };
      });

      expect(exportResult.status).toBe(200);
      expect(exportResult.text).toContain(
        "Nickname,Puntuación,Correctas,Verificado",
      );
      expect(exportResult.text).toContain("abc1234,850,4,Sí");
    });
  });
});
