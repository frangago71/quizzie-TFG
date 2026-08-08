import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ScannerModal from "../../room-play/ScannerModal";

vi.mock("html5-qrcode", () => {
  return {
    Html5QrcodeScanner: class {
      render(
        successCb: (text: string) => void,
        errorCb: (err: string) => void,
      ) {
        // Trigger both callbacks to cover the branches
        successCb("mock-student-uvus");
        errorCb("mock-error");
      }
      clear() {
        return Promise.resolve();
      }
    },
  };
});

describe("ScannerModal Component", () => {
  it("renders modal header and closes on close button click", () => {
    const onClose = vi.fn();
    const onScan = vi.fn();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(<ScannerModal onClose={onClose} onScan={onScan} />);

    expect(screen.getByText("Escanear QR de Alumno")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith("mock-student-uvus");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error al escanear QR: ",
      "mock-error",
    );

    consoleSpy.mockRestore();
  });
});
