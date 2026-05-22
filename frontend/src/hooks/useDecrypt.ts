import { useEffect, useRef, useState } from "react";
const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

export function useDecrypt(text: string, trigger: boolean, duration = 1000) {
  const [displayed, setDisplayed] = useState("");
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!trigger) {
      setDisplayed("");
      return;
    }
    let iteration = 0;
    const totalSteps = 18;
    const intervalMs = duration / totalSteps;

    const step = () => {
      const revealedCount = Math.floor((iteration / totalSteps) * text.length);
      const result = text
        .split("")
        .map((char, i) => {
          if (char === " " || char === "\n") return char;
          if (i < revealedCount) return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("");
      setDisplayed(result);
      iteration++;
      if (iteration <= totalSteps) {
        frame.current = setTimeout(step, intervalMs);
      } else {
        setDisplayed(text);
      }
    };
    step();
    return () => clearTimeout(frame.current);
  }, [trigger, text, duration]);

  return displayed;
}
