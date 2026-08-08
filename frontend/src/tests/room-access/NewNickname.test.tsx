import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import NewNickname from "../../room-access/NewNickname";
import api from "../../api";
import { ToastProvider } from "../../context/ToastContext";

vi.mock("../../api", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("NewNickname Component", () => {
  it("renders modal with nickname and buttons", () => {
    render(
      <ToastProvider>
        <NewNickname
          nickname="estudiante1"
          roomId={10}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </ToastProvider>,
    );

    expect(screen.getByText("Estudiante no encontrado")).toBeInTheDocument();
    expect(screen.getByText("@estudiante1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear nuevo estudiante" }),
    ).toBeInTheDocument();
  });

  it("registers new student and joins room on confirm", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ data: { student_id: 50 } })
      .mockResolvedValueOnce({ data: { participant_id: 100 } });

    const onConfirm = vi.fn();

    render(
      <ToastProvider>
        <NewNickname
          nickname="estudiante1"
          roomId={10}
          onConfirm={onConfirm}
          onCancel={vi.fn()}
        />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Crear nuevo estudiante" }),
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        "/users/students?nickname=estudiante1",
      );
      expect(api.post).toHaveBeenCalledWith("/stage/participants", null, {
        params: { student_id: 50, room_id: 10 },
      });
      expect(onConfirm).toHaveBeenCalledWith("estudiante1", 100);
    });
  });

  it("shows error toast on API failure", async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { data: { detail: "El usuario ya existe" } },
    });

    render(
      <ToastProvider>
        <NewNickname
          nickname="estudiante1"
          roomId={10}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </ToastProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Crear nuevo estudiante" }),
    );

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });
});
