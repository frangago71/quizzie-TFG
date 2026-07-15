import React from "react";

interface CodeInputGridProps {
  code: string[];
  inputsRef: React.RefObject<(HTMLInputElement | null)[]>;
  handleChange: (value: string, index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent, index: number) => void;
  loading: boolean;
}

const digitKeys = [
  "digit-0",
  "digit-1",
  "digit-2",
  "digit-3",
  "digit-4",
  "digit-5",
];

export const CodeInputGrid: React.FC<CodeInputGridProps> = ({
  code,
  inputsRef,
  handleChange,
  handleKeyDown,
  loading,
}) => {
  return (
    <div className="code-inputs-group">
      {code.map((digit, index) => (
        <input
          key={digitKeys[index]}
          ref={(el) => {
            if (inputsRef.current) {
              inputsRef.current[index] = el;
            }
          }}
          type="text"
          inputMode="numeric"
          value={digit}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="code-box cyan"
          disabled={loading}
        />
      ))}
    </div>
  );
};
