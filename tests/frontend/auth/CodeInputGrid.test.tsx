import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CodeInputGrid } from "@/auth/CodeInputGrid";

describe("CodeInputGrid", () => {
  it("renders 6 input boxes with provided digit values", () => {
    const code = ["1", "2", "3", "4", "5", "6"];
    const inputsRef = { current: [] as (HTMLInputElement | null)[] };
    const handleChange = vi.fn();
    const handleKeyDown = vi.fn();

    render(
      <CodeInputGrid
        code={code}
        inputsRef={inputsRef}
        handleChange={handleChange}
        handleKeyDown={handleKeyDown}
        loading={false}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
    expect((inputs[0] as HTMLInputElement).value).toBe("1");
    expect((inputs[5] as HTMLInputElement).value).toBe("6");
  });

  it("triggers handleChange when typing in an input box", () => {
    const code = ["", "", "", "", "", ""];
    const inputsRef = { current: [] as (HTMLInputElement | null)[] };
    const handleChange = vi.fn();
    const handleKeyDown = vi.fn();

    render(
      <CodeInputGrid
        code={code}
        inputsRef={inputsRef}
        handleChange={handleChange}
        handleKeyDown={handleKeyDown}
        loading={false}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "8" } });
    expect(handleChange).toHaveBeenCalledWith("8", 0);
  });

  it("disables all inputs when loading is true", () => {
    const code = ["", "", "", "", "", ""];
    const inputsRef = { current: [] as (HTMLInputElement | null)[] };
    const handleChange = vi.fn();
    const handleKeyDown = vi.fn();

    render(
      <CodeInputGrid
        code={code}
        inputsRef={inputsRef}
        handleChange={handleChange}
        handleKeyDown={handleKeyDown}
        loading={true}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("does not crash when inputsRef.current is null", () => {
    const code = ["", "", "", "", "", ""];
    const inputsRef = {
      current: null as unknown as (HTMLInputElement | null)[],
    };
    const handleChange = vi.fn();
    const handleKeyDown = vi.fn();

    expect(() =>
      render(
        <CodeInputGrid
          code={code}
          inputsRef={inputsRef}
          handleChange={handleChange}
          handleKeyDown={handleKeyDown}
          loading={false}
        />,
      ),
    ).not.toThrow();
  });
});
