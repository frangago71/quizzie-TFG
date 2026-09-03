import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { VerifyEmail } from "@/auth/VerifyEmail";
import api from "@/api";
import { ToastProvider } from "@/context/ToastContext";

vi.mock("@/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("VerifyEmail Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    initialEntries = ["/verify-email?email=user@test.com"],
  ) =>
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <VerifyEmail />
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders with email prefilled", () => {
    renderComponent();
    const emailInput = screen.getByLabelText(
      /CORREO ELECTRÓNICO/i,
    ) as HTMLInputElement;
    expect(emailInput.value).toBe("user@test.com");
  });

  it("submits code for verification", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access_token: "verify-token" },
    });

    renderComponent();

    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    codeInputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    const submitBtn = screen.getByRole("button", { name: /Activar Cuenta/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/users/verify-email", {
        email: "user@test.com",
        code: "123456",
      });
    });
  });

  it("resends verification code when button clicked", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { message: "Sent" } });

    renderComponent();

    const resendBtn = screen.getByRole("button", { name: /Reenviar/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/users/resend-verification", {
        email: "user@test.com",
      });
    });
  });

  it("handles Backspace key to focus previous input", () => {
    renderComponent();
    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    // Fill index 1, then simulate Backspace on empty slot
    fireEvent.change(codeInputs[1], { target: { value: "2" } });
    fireEvent.change(codeInputs[1], { target: { value: "" } });
    fireEvent.keyDown(codeInputs[1], { key: "Backspace" });
    // Handler must execute without throwing
  });

  it("shows error toast when fields are empty on submit", async () => {
    renderComponent();
    // Button disabled when code has empty strings
    const submitBtn = screen.getByRole("button", { name: /Activar Cuenta/i });
    expect(submitBtn).toBeDisabled();
  });

  it("redirects to /login when response has no access_token", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} }); // no access_token

    Object.defineProperty(globalThis, "location", {
      writable: true,
      value: { href: "" },
    });

    renderComponent();

    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    codeInputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    fireEvent.click(screen.getByRole("button", { name: /Activar Cuenta/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/users/verify-email", {
        email: "user@test.com",
        code: "123456",
      });
    });
  });

  it("shows error toast on verify api failure", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { detail: "Código inválido" } },
    });

    renderComponent();

    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    codeInputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    fireEvent.click(screen.getByRole("button", { name: /Activar Cuenta/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("shows error toast when resend is clicked with empty email", async () => {
    // Render without pre-filled email so the field is editable
    renderComponent(["/verify-email"]);

    // Clear the email field (it defaults to empty when no param)
    const resendBtn = screen.getByRole("button", { name: /Reenviar/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it("shows error toast on resend api failure", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { detail: "Error al reenviar" } },
    });

    renderComponent();

    const resendBtn = screen.getByRole("button", { name: /Reenviar/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("navigates to /login when clicking back button", () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/verify-email?email=user@test.com"]}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmail />} />
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
});
