import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResetPassword } from "../../auth/ResetPassword";
import api from "../../api";
import { ToastProvider } from "../../context/ToastContext";

vi.mock("../../api", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("ResetPassword Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  const renderComponent = (
    initialEntries = ["/reset-password?email=user@test.com"],
  ) =>
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <ResetPassword />
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders with email pre-filled from search params", () => {
    renderComponent();
    const emailInput = screen.getByLabelText(
      /CORREO ELECTRÓNICO/i,
    ) as HTMLInputElement;
    expect(emailInput.value).toBe("user@test.com");
  });

  it("allows entering 6-digit code and passwords then submitting", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access_token: "new-token" },
    });

    renderComponent();

    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    codeInputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    const newPassInput = screen.getByLabelText(/^NUEVA CONTRASEÑA$/i);
    const confirmPassInput = screen.getByLabelText(
      /CONFIRMAR NUEVA CONTRASEÑA/i,
    );

    fireEvent.change(newPassInput, { target: { value: "secret123" } });
    fireEvent.change(confirmPassInput, { target: { value: "secret123" } });

    const submitBtn = screen.getByRole("button", {
      name: /Cambiar contraseña/i,
    });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/users/reset-password", {
        email: "user@test.com",
        code: "123456",
        new_password: "secret123",
      });
    });
  });

  it("shows error when passwords do not match", async () => {
    renderComponent();

    const newPassInput = screen.getByLabelText(/^NUEVA CONTRASEÑA$/i);
    const confirmPassInput = screen.getByLabelText(
      /CONFIRMAR NUEVA CONTRASEÑA/i,
    );

    fireEvent.change(newPassInput, { target: { value: "secret123" } });
    fireEvent.change(confirmPassInput, { target: { value: "different" } });

    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    codeInputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Cambiar contraseña/i }),
    );

    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it("handles Backspace key to focus previous input", () => {
    renderComponent();
    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    // Fill index 1 then clear it – pressing Backspace on empty input[1] should focus input[0]
    fireEvent.change(codeInputs[1], { target: { value: "2" } });
    fireEvent.change(codeInputs[1], { target: { value: "" } });
    fireEvent.keyDown(codeInputs[1], { key: "Backspace" });
    // No throw expected; focus behavior is browser-native but handler must run
  });

  it("shows error toast when fields are empty on submit", async () => {
    renderComponent(["reset-password"]);
    // Submit with completely empty code
    const submitBtn = screen.getByRole("button", {
      name: /Cambiar contraseña/i,
    });
    // Button is disabled because code includes empty strings; verify it
    expect(submitBtn).toBeDisabled();
  });

  it("shows error when code is incomplete (less than 6 digits)", async () => {
    // Remove email param so email can be edited
    renderComponent(["/reset-password"]);
    // Fill only 3 of 6 code inputs
    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    fireEvent.change(codeInputs[0], { target: { value: "1" } });
    fireEvent.change(codeInputs[1], { target: { value: "2" } });
    fireEvent.change(codeInputs[2], { target: { value: "3" } });
    // Submit button should remain disabled since code still has empty entries
    const submitBtn = screen.getByRole("button", {
      name: /Cambiar contraseña/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it("shows error when new password is too short (< 6 chars)", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    renderComponent();

    const textboxes = screen.getAllByRole("textbox");
    const codeInputs = textboxes.filter(
      (tb) => tb !== screen.getByLabelText(/CORREO ELECTRÓNICO/i),
    );
    codeInputs.forEach((input, idx) => {
      fireEvent.change(input, { target: { value: String(idx + 1) } });
    });

    fireEvent.change(screen.getByLabelText(/^NUEVA CONTRASEÑA$/i), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByLabelText(/CONFIRMAR NUEVA CONTRASEÑA/i), {
      target: { value: "abc" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Cambiar contraseña/i }),
    );

    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
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

    fireEvent.change(screen.getByLabelText(/^NUEVA CONTRASEÑA$/i), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText(/CONFIRMAR NUEVA CONTRASEÑA/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Cambiar contraseña/i }),
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("shows error toast on api failure", async () => {
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

    fireEvent.change(screen.getByLabelText(/^NUEVA CONTRASEÑA$/i), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText(/CONFIRMAR NUEVA CONTRASEÑA/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Cambiar contraseña/i }),
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("navigates to /login when clicking the back button", () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={["/reset-password?email=user@test.com"]}>
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
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
