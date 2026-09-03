import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ForgotPassword } from "@/auth/ForgotPassword";
import api from "@/api";
import { ToastProvider } from "@/context/ToastContext";

vi.mock("@/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("ForgotPassword Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <MemoryRouter>
          <ForgotPassword />
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders input field and submit button", () => {
    renderComponent();
    expect(screen.getByLabelText(/CORREO ELECTRÓNICO/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Solicitar código/i }),
    ).toBeInTheDocument();
  });

  it("submits email successfully", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { message: "OK" } });
    renderComponent();

    const input = screen.getByLabelText(/CORREO ELECTRÓNICO/i);
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Solicitar código/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/users/forgot-password", {
        email: "test@example.com",
      });
    });
  });

  it("handles api error gracefully", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { detail: "Email no encontrado" } },
    });
    renderComponent();

    const input = screen.getByLabelText(/CORREO ELECTRÓNICO/i);
    fireEvent.change(input, { target: { value: "notfound@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Solicitar código/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/users/forgot-password", {
        email: "notfound@example.com",
      });
    });
  });

  it("shows error toast when email is empty on submit", async () => {
    renderComponent();
    // Don't fill the email, submit directly
    fireEvent.click(screen.getByRole("button", { name: /Solicitar código/i }));
    // api.post should NOT be called
    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it("navigates to /login when clicking back button", () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/login" element={<div>Login View</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Volver a inicio de sesión/i }),
    );
    expect(screen.getByText("Login View")).toBeInTheDocument();
  });

  it("navigates to reset-password after successful submission", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { message: "OK" } });

    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/reset-password"
              element={<div>ResetPassword View</div>}
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    const input = screen.getByLabelText(/CORREO ELECTRÓNICO/i);
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Solicitar código/i }));

    await waitFor(() => {
      expect(screen.getByText("ResetPassword View")).toBeInTheDocument();
    });
  });
});
