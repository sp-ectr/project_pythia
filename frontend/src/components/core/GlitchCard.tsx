import { useEffect, useState } from "react";

export function GlitchCard({ cardId }: { cardId: number }) {
  const [visible, setVisible] = useState(false);
  const [glitching, setGlitching] = useState(true);

  useEffect(() => {
    setVisible(false);
    setGlitching(true);
    const t1 = setTimeout(() => setVisible(true), 60);
    const t2 = setTimeout(() => setGlitching(false), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cardId]);

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-cyan-400/40"
      style={{
        width: "100%",
        height: "100%",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
    >
      <img
        src={`/cards/${cardId}.webp`}
        alt=""
        className="w-full h-full object-cover"
        style={{
          filter: glitching
            ? "hue-rotate(180deg) saturate(3) brightness(1.5)"
            : "none",
          transition: "filter 0.4s ease",
        }}
      />
      {glitching && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(34,211,238,0.15) 3px, rgba(34,211,238,0.15) 4px)",
              mixBlendMode: "screen",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "rgba(34,211,238,0.12)",
              clipPath: `inset(${Math.random() * 60}% 0 ${Math.random() * 20}% 0)`,
              transform: `translateX(${(Math.random() - 0.5) * 12}px)`,
            }}
          />
        </>
      )}
      <div className="absolute inset-0 shadow-[0_0_18px_rgba(34,211,238,0.35)] rounded-lg pointer-events-none" />
    </div>
  );
}
