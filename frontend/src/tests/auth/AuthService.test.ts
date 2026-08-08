import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { authService } from "../../auth/authService";

describe("authService", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles successful register", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", username: "user", email: "user@test.com" }),
    });

    const res = await authService.register({
      username: "user",
      email: "user@test.com",
      password: "password123",
    });

    expect(res).toEqual({ id: "1", username: "user", email: "user@test.com" });
  });

  it("throws AuthError on failed register", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "El email ya existe" }),
    });

    await expect(
      authService.register({
        username: "user",
        email: "user@test.com",
        password: "password123",
      }),
    ).rejects.toThrow("El email ya existe");
  });

  it("handles login and stores token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "fake-jwt-token",
        token_type: "bearer",
      }),
    });

    const res = await authService.login({
      email: "user@test.com",
      password: "password123",
    });

    expect(res.access_token).toBe("fake-jwt-token");
    expect(authService.getToken()).toBe("fake-jwt-token");
    expect(authService.isLoggedIn()).toBe(true);
  });

  it("throws AuthError on failed login", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Credenciales incorrectas" }),
    });

    await expect(
      authService.login({
        email: "user@test.com",
        password: "wrongpass",
      }),
    ).rejects.toThrow("Credenciales incorrectas");
  });

  it("handles logout and clearing token", () => {
    sessionStorage.setItem("token", "my-token");
    expect(authService.isLoggedIn()).toBe(true);

    authService.logout();
    expect(authService.getToken()).toBeNull();
    expect(authService.isLoggedIn()).toBe(false);
  });

  it("uses fallback message when json() rejects on failed register", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no body");
      },
    });

    await expect(
      authService.register({
        username: "u",
        email: "u@test.com",
        password: "pw",
      }),
    ).rejects.toThrow("Error en el registro");
  });

  it("uses fallback message when json() rejects on failed login", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no body");
      },
    });

    await expect(
      authService.login({ email: "u@test.com", password: "pw" }),
    ).rejects.toThrow("Error de autenticación");
  });
});
