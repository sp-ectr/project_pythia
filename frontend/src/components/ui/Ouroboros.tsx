export function Ouroboros() {
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full animate-spin"
        style={{ animationDuration: "3s", animationTimingFunction: "linear" }}
      >
        <defs>
          <linearGradient id="ouro-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Тело змеи — дуга */}
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="url(#ouro-grad)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="240 40"
        />
        {/* Голова */}
        <circle cx="60" cy="16" r="5" fill="#22d3ee" opacity="0.95" />
        {/* Глаз */}
        <circle cx="62" cy="15" r="1.2" fill="#000" />
        {/* Хвост */}
        <polygon
          points="54,18 60,6 66,18"
          fill="#22d3ee"
          opacity="0.5"
          transform="rotate(170 60 60)"
        />
      </svg>
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: "inset 0 0 20px rgba(34,211,238,0.08)" }}
      />
    </div>
  );
}
