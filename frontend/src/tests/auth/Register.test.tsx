import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Register } from "../../auth/Register";
import { authService } from "../../auth/authService";
import { ToastProvider } from "../../context/ToastContext";

vi.mock("../../auth/authService", () => ({
  authService: {
    isLoggedIn: vi.fn().mockReturnValue(false),
    register: vi.fn(),
  },
}));

describe("Register Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route
              path="/verify-email"
              element={<div>Verify Email View</div>}
            />
            <Route path="/login" element={<div>Login View</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders register form fields and footer links", () => {
    renderComponent();

    expect(screen.getByLabelText(/NOMBRE DE USUARIO/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^EMAIL$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^CONTRASEÑA$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CONFIRMAR CONTRASEÑA/i)).toBeInTheDocument();
  });

  it("validates short username and short password before submitting", async () => {
    renderComponent();

    const usernameInput = screen.getByLabelText(/NOMBRE DE USUARIO/i);
    const emailInput = screen.getByLabelText(/^EMAIL$/i);
    const passwordInput = screen.getByLabelText(/^CONTRASEÑA$/i);
    const confirmPasswordInput = screen.getByLabelText(/CONFIRMAR CONTRASEÑA/i);

    fireEvent.change(usernameInput, { target: { value: "ab" } });
    fireEvent.change(emailInput, { target: { value: "profesor@us.es" } });
    fireEvent.change(passwordInput, { target: { value: "123456" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "123456" } });

    fireEvent.click(screen.getByRole("button", { name: /Registrarse/i }));

    expect(
      screen.getByText(
        "El nombre de usuario debe tener al menos 3 caracteres.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(usernameInput, { target: { value: "profesor1" } });
    fireEvent.change(passwordInput, { target: { value: "123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "123" } });

    fireEvent.click(screen.getByRole("button", { name: /Registrarse/i }));

    expect(
      screen.getByText("La contraseña debe tener al menos 6 caracteres."),
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/NOMBRE DE USUARIO/i), {
      target: { value: "profesor1" },
    });
    fireEvent.change(screen.getByLabelText(/^EMAIL$/i), {
      target: { value: "profesor@us.es" },
    });
    fireEvent.change(screen.getByLabelText(/^CONTRASEÑA$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/CONFIRMAR CONTRASEÑA/i), {
      target: { value: "different" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Registrarse/i }));

    expect(
      screen.getByText("Las contraseñas no coinciden."),
    ).toBeInTheDocument();
  });

  it("registers user successfully and navigates to verify email", async () => {
    vi.mocked(authService.register).mockResolvedValueOnce({
      id: 1,
      username: "profesor1",
      email: "profesor@us.es",
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/NOMBRE DE USUARIO/i), {
      target: { value: "profesor1" },
    });
    fireEvent.change(screen.getByLabelText(/^EMAIL$/i), {
      target: { value: "profesor@us.es" },
    });
    fireEvent.change(screen.getByLabelText(/^CONTRASEÑA$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/CONFIRMAR CONTRASEÑA/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Registrarse/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        username: "profesor1",
        email: "profesor@us.es",
        password: "password123",
      });
      expect(screen.getByText("Verify Email View")).toBeInTheDocument();
    });
  });

  it("handles register API rejection error", async () => {
    vi.mocked(authService.register).mockRejectedValueOnce({
      message: "Email ya en uso",
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/NOMBRE DE USUARIO/i), {
      target: { value: "profesor1" },
    });
    fireEvent.change(screen.getByLabelText(/^EMAIL$/i), {
      target: { value: "existente@us.es" },
    });
    fireEvent.change(screen.getByLabelText(/^CONTRASEÑA$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/CONFIRMAR CONTRASEÑA/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Registrarse/i }));

    await waitFor(() => {
      expect(screen.getByText("Email ya en uso")).toBeInTheDocument();
    });
  });

  it("navigates to login via login footer link", () => {
    renderComponent();

    const loginLink = screen.getByRole("button", {
      name: /¿Ya tienes cuenta\? Inicia sesión/i,
    });
    fireEvent.click(loginLink);
    expect(screen.getByText("Login View")).toBeInTheDocument();
  });

  it("triggers history back via student zone footer link", () => {
    const backSpy = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => {});

    renderComponent();

    const studentLink = screen.getByRole("button", {
      name: /Ir a zona de alumnos/i,
    });
    fireEvent.click(studentLink);
    expect(backSpy).toHaveBeenCalled();
  });
});
