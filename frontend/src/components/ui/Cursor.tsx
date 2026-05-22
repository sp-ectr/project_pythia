interface CursorProps {
  className?: string;
  isBlinking?: boolean; // ← новый пропс
}

export function Cursor({ className = "", isBlinking = false }: CursorProps) {
  return (
    <span
      className={`terminal-cursor ${isBlinking ? "blink" : ""} ${className}`}
    />
  );
}
