import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DeleteQuizModal, { type Room } from "../../management/DeleteQuizModal";

describe("DeleteQuizModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <DeleteQuizModal
        isOpen={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        rooms={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders options and enables hard delete when no active rooms exist", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const rooms: Room[] = [{ id: 1, status: "finished" }];

    render(
      <DeleteQuizModal
        isOpen={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        rooms={rooms}
      />,
    );

    expect(screen.getByText("¿Borrar cuestionario?")).toBeInTheDocument();

    const softDeleteBtn = screen.getByRole("button", {
      name: "Borrar cuestionario",
    });
    fireEvent.click(softDeleteBtn);
    expect(onConfirm).toHaveBeenCalledWith(false);

    const hardDeleteBtn = screen.getByRole("button", {
      name: "Borrar cuestionario y sus salas",
    });
    expect(hardDeleteBtn).not.toBeDisabled();
    fireEvent.click(hardDeleteBtn);
    expect(onConfirm).toHaveBeenCalledWith(true);

    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables hard delete button when active rooms exist", () => {
    const rooms: Room[] = [{ id: 1, status: "live" }];

    render(
      <DeleteQuizModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        rooms={rooms}
      />,
    );

    const hardDeleteBtn = screen.getByRole("button", {
      name: "Borrar cuestionario y sus salas",
    });
    expect(hardDeleteBtn).toBeDisabled();
  });

  it("calls onCancel when Escape key is pressed on the overlay", () => {
    const onCancel = vi.fn();
    render(
      <DeleteQuizModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        rooms={[]}
      />,
    );

    const overlay = document.querySelector(".modal-overlay")!;
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when the overlay backdrop is clicked", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <DeleteQuizModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        rooms={[]}
      />,
    );

    // Click directly on the overlay element (not on the modal-card inside)
    const overlay = container.querySelector(".modal-overlay")!;
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalled();
  });
});
