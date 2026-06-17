import { playSound } from "../../utils/sound";

export function TerminalButton({
  onClick,
  children,
  variant = "primary",
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "cancel" | "danger";
  disabled?: boolean;
}) {
  const colors = {
    primary:
      "border-cyan-400/60 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25),0_0_30px_rgba(34,211,238,0.1)] animate-glow",
    cancel: "border-slate-600/50 text-slate-500 shadow-none",
    danger:
      "border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
  };

  const handleClick = () => {
    if (variant === "primary") {
      playSound("/sounds/start.mp3", 0.5);
    } else {
      playSound("/sounds/cancel.mp3", 0.5);
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`group relative w-full py-4 font-mono uppercase tracking-[0.35em] text-xs
        bg-black border rounded-md overflow-hidden
        transition-all duration-300 active:scale-[0.97]
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}
        ${colors[variant]}`}
    >
      <span className="absolute inset-0 overflow-hidden">
        <span className="absolute top-0 left-[-130%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:animate-[scan_1s_linear]" />
      </span>
      <span
        className="absolute bottom-0 left-0 w-full h-[1px] opacity-40 group-hover:opacity-80 transition"
        style={{
          background:
            variant === "cancel"
              ? "#475569"
              : variant === "danger"
                ? "#f43f5e"
                : "#67e8f9",
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
