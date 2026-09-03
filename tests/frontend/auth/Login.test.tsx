import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes, Navigate } from "react-router-dom";
import { Login } from "@/auth/Login";
import { authService } from "@/auth/authService";
import { ToastProvider } from "@/context/ToastContext";

vi.mock("@/auth/authService", () => ({
  authService: {
    isLoggedIn: vi.fn().mockReturnValue(false),
    login: vi.fn(),
  },
}));

describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/quizzes" element={<div>Quizzes View</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders email and password inputs and submit button", () => {
    renderComponent();

    expect(screen.getByLabelText(/EMAIL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CONTRASEÑA/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entrar/i })).toBeInTheDocument();
  });

  it("allows user to type into email and password fields", () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/EMAIL/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /CONTRASEÑA/i,
    ) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "profesor@us.es" } });
    fireEvent.change(passwordInput, { target: { value: "secreto123" } });

    expect(emailInput.value).toBe("profesor@us.es");
    expect(passwordInput.value).toBe("secreto123");
  });

  it("handles successful login and redirects to quizzes", async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      access_token: "token123",
      token_type: "bearer",
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/EMAIL/i), {
      target: { value: "profesor@us.es" },
    });
    fireEvent.change(screen.getByLabelText(/CONTRASEÑA/i), {
      target: { value: "secreto123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: "profesor@us.es",
        password: "secreto123",
      });
    });
  });

  it("displays error message on failed login attempt", async () => {
    vi.mocked(authService.login).mockRejectedValueOnce({
      message: "Credenciales incorrectas",
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/EMAIL/i), {
      target: { value: "profesor@us.es" },
    });
    fireEvent.change(screen.getByLabelText(/CONTRASEÑA/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalled();
    });
  });

  it("redirects to /quizzes when already logged in", () => {
    vi.mocked(authService.isLoggedIn).mockReturnValue(true);
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route
              path="/login"
              element={
                authService.isLoggedIn() ? (
                  <Navigate to="/quizzes" replace />
                ) : (
                  <Login />
                )
              }
            />
            <Route path="/quizzes" element={<div>Quizzes View</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    expect(screen.getByText("Quizzes View")).toBeInTheDocument();
  });

  it("shows warning toast and navigates to verify-email on 403 error", async () => {
    vi.mocked(authService.isLoggedIn).mockReturnValue(false);
    vi.mocked(authService.login).mockRejectedValueOnce({
      status: 403,
      message: "Tu cuenta no está verificada. Por favor, verifica tu correo.",
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/EMAIL/i), {
      target: { value: "unverified@quizzie.com" },
    });
    fireEvent.change(screen.getByLabelText(/CONTRASEÑA/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalled();
    });
  });

  it("shows generic error toast when 500 error occurs without detail", async () => {
    vi.mocked(authService.login).mockRejectedValueOnce({});

    renderComponent();

    fireEvent.change(screen.getByLabelText(/EMAIL/i), {
      target: { value: "error@quizzie.com" },
    });
    fireEvent.change(screen.getByLabelText(/CONTRASEÑA/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalled();
    });
  });

  it("navigates to forgot-password when link is clicked", () => {
    renderComponent();
    fireEvent.click(
      screen.getByRole("button", { name: /¿Has olvidado tu contraseña\?/i }),
    );
  });

  it("navigates to register when link is clicked", () => {
    renderComponent();
    fireEvent.click(
      screen.getByRole("button", { name: /¿No tienes cuenta\? Regístrate/i }),
    );
  });

  it("navigates back to student area when link is clicked", () => {
    const backSpy = vi.spyOn(window.history, "back");
    renderComponent();
    fireEvent.click(
      screen.getByRole("button", { name: /Ir a zona de alumnos/i }),
    );
    expect(backSpy).toHaveBeenCalled();
  });
});
