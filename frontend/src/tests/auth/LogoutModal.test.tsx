import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LogoutModal from "../../auth/LogoutModal";

describe("LogoutModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <LogoutModal isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders content and triggers callbacks when open", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <LogoutModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    expect(screen.getByText("¿Cerrar sesión?")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /Cerrar sesión/i });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);

    const backdropBtn = screen.getByLabelText("Cerrar ventana emergente");
    fireEvent.click(backdropBtn);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
