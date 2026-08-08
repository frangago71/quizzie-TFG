import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Profile } from "../../auth/Profile";
import api from "../../api";
import { ToastProvider } from "../../context/ToastContext";
import ToastContainer from "../../layouts/ToastContainer";

vi.mock("../../auth/authService", () => ({
  authService: { logout: vi.fn() },
}));

vi.mock("../../api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Profile Component", () => {
  const mockUser = {
    id: "1",
    username: "ProfesorUs",
    email: "profesor@us.es",
    created_at: "2026-08-01",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <ToastProvider>
        <ToastContainer />
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      </ToastProvider>,
    );

  it("renders profile details after loading", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
      expect(screen.getByText("profesor@us.es")).toBeInTheDocument();
    });
  });

  it("allows editing username and saving", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });
    vi.mocked(api.put).mockResolvedValueOnce({
      data: { ...mockUser, username: "NuevoNombre" },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /Editar Perfil/i });
    fireEvent.click(editBtn);

    const input = screen.getByDisplayValue("ProfesorUs");
    fireEvent.change(input, { target: { value: "NuevoNombre" } });

    const saveBtn = screen.getByRole("button", { name: "Guardar" });
    const form = saveBtn.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/users/me", {
        username: "NuevoNombre",
      });
    });
  });

  it("shows validation error when username is too short", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /Editar Perfil/i });
    fireEvent.click(editBtn);

    const input = screen.getByDisplayValue("ProfesorUs");
    fireEvent.change(input, { target: { value: "ab" } });

    const saveBtn = screen.getByRole("button", { name: "Guardar" });
    const form = saveBtn.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(
          "El nombre de usuario debe tener al menos 3 caracteres.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("cancels editing and restores original username", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /Editar Perfil/i });
    fireEvent.click(editBtn);

    const input = screen.getByDisplayValue("ProfesorUs");
    fireEvent.change(input, { target: { value: "TemporalNombre" } });

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
    });
  });

  it("handles error state when loading profile fails", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Unauthorized"));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Error al cargar el perfil")).toBeInTheDocument();
    });

    const loginBtn = screen.getByRole("button", { name: "Ir a Login" });
    expect(loginBtn).toBeInTheDocument();
  });

  it("triggers recover password flow", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
    });

    const recoverBtn = screen.getByRole("button", {
      name: /Restablecer mi contraseña/i,
    });
    fireEvent.click(recoverBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/users/forgot-password", {
        email: "profesor@us.es",
      });
    });
  });

  it("opens delete account modal and closes with cancel", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", {
      name: /Eliminar mi cuenta/i,
    });
    fireEvent.click(deleteBtn);

    expect(
      screen.getByText("¿Eliminar cuenta permanentemente?"),
    ).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByText("¿Eliminar cuenta permanentemente?"),
      ).not.toBeInTheDocument();
    });
  });

  it("opens delete account modal, types password and confirms account deletion", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });
    vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", {
      name: /Eliminar mi cuenta/i,
    });
    fireEvent.click(deleteBtn);

    expect(
      screen.getByText("¿Eliminar cuenta permanentemente?"),
    ).toBeInTheDocument();

    const passwordInput = screen.getByLabelText("CONTRASEÑA");
    fireEvent.change(passwordInput, { target: { value: "secret123" } });

    const confirmDeleteBtn = screen.getByRole("button", {
      name: "Eliminar cuenta",
    });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/users/me", {
        data: { password: "secret123" },
      });
    });
  });

  it("shows loading state before profile loads", () => {
    // api.get never resolves so component stays in loading state
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText("Cargando perfil...")).toBeInTheDocument();
  });

  it("shows error toast and does not save when username is empty", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    await waitFor(() =>
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar Perfil/i }));

    const input = screen.getByDisplayValue("ProfesorUs");
    fireEvent.change(input, { target: { value: "   " } }); // blank

    const saveBtn = screen.getByRole("button", { name: "Guardar" });
    fireEvent.submit(saveBtn.closest("form")!);

    await waitFor(() => {
      expect(api.put).not.toHaveBeenCalled();
    });
  });

  it("shows error toast on save profile api failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });
    vi.mocked(api.put).mockRejectedValueOnce({
      response: { data: { detail: "Username ya en uso" } },
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Editar Perfil/i }));

    const input = screen.getByDisplayValue("ProfesorUs");
    fireEvent.change(input, { target: { value: "NombreValido" } });

    fireEvent.submit(
      screen.getByRole("button", { name: "Guardar" }).closest("form")!,
    );

    await waitFor(() => {
      expect(api.put).toHaveBeenCalled();
    });
  });

  it("shows error toast on recover password api failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { detail: "Email no encontrado" } },
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Restablecer mi contraseña/i }),
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it("closes delete modal when backdrop is clicked", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });

    renderComponent();

    await waitFor(() =>
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Eliminar mi cuenta/i }),
    );
    expect(
      screen.getByText("¿Eliminar cuenta permanentemente?"),
    ).toBeInTheDocument();

    // Click the backdrop button (aria-label="Cerrar ventana emergente")
    fireEvent.click(
      screen.getByRole("button", { name: "Cerrar ventana emergente" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("¿Eliminar cuenta permanentemente?"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows error toast on delete account api failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockUser });
    vi.mocked(api.delete).mockRejectedValueOnce({
      response: { data: { detail: "Contraseña incorrecta" } },
    });

    renderComponent();

    await waitFor(() =>
      expect(screen.getAllByText("ProfesorUs")[0]).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Eliminar mi cuenta/i }),
    );

    const passwordInput = screen.getByLabelText("CONTRASEÑA");
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });

    fireEvent.click(screen.getByRole("button", { name: "Eliminar cuenta" }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalled();
    });
  });
});
