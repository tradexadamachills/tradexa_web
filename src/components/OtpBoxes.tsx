import { useEffect, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";

/** Six one-digit boxes: auto-advance, backspace goes back, paste fills all. */
export function OtpBoxes({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  length = 6,
}: {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => {
    if (value === "") refs.current[0]?.focus();
  }, [value]);

  function commit(digits: string) {
    const next = digits.replace(/\D/g, "").slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  }
  function set(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    // typing or autofill: write from this box onwards
    const next = (value.slice(0, index) + digits).slice(0, length);
    commit(next + value.slice(next.length));
    refs.current[Math.min(index + digits.length, length - 1)]?.focus();
  }
  function onKey(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      event.preventDefault();
      commit(value.slice(0, index - 1) + value.slice(index));
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }
  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!/\d/.test(text)) return;
    event.preventDefault();
    commit(text);
    refs.current[Math.min(text.replace(/\D/g, "").length, length) - 1]?.focus();
  }

  return (
    <div
      className="otp-boxes"
      role="group"
      aria-label="Six-digit verification code"
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={invalid ? "otp-box invalid" : "otp-box"}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={length}
          value={value[i] ?? ""}
          disabled={disabled}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
