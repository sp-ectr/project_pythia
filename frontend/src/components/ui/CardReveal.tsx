import { useEffect, useRef } from "react";
import { playSound } from "../../utils/sound";

interface CardRevealProps {
  src: string;
  alt: string;
  revealKey: number | string;
  isReversed?: boolean;
}

const TOTAL_DURATION = 1800;

export function CardReveal({
  src,
  revealKey,
  isReversed: _isReversed = false,
}: CardRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      if (!active) return;
      playSound("/sounds/cardreveal.mp3", 0.5);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const start = performance.now();

      const particles: {
        x: number;
        y: number;
        size: number;
        alpha: number;
      }[] = [];

      for (let i = 0; i < 4500; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 1,
          alpha: Math.random(),
        });
      }

      const animate = (now: number) => {
        if (!active) return;

        const elapsed = now - start;
        const progress = Math.min(elapsed / TOTAL_DURATION, 1);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(3,6,15,1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
          const appearThreshold =
            (p.y / canvas.height) * 0.8;

          if (progress > appearThreshold) {
            ctx.fillStyle = `rgba(34,211,238,${
              p.alpha * (1 - progress * 0.5)
            })`;

            ctx.fillRect(
              p.x,
              p.y,
              p.size,
              p.size
            );
          }
        });

        ctx.save();

        ctx.globalAlpha = Math.pow(progress, 1.7);

        const slices = 24;

        for (let i = 0; i < slices; i++) {
          const sliceY =
            (canvas.height / slices) * i;

          const offset =
            (1 - progress) *
            (Math.random() * 80 - 40);

          ctx.drawImage(
            img,
            0,
            sliceY,
            canvas.width,
            canvas.height / slices,

            offset,
            sliceY,
            canvas.width,
            canvas.height / slices
          );
        }

        ctx.restore();

        const waveY =
          canvas.height * progress;

        ctx.fillStyle =
          "rgba(255,255,255,0.9)";

        ctx.fillRect(
          0,
          waveY - 2,
          canvas.width,
          2
        );

        ctx.fillStyle =
          "rgba(34,211,238,0.35)";

        ctx.fillRect(
          0,
          waveY - 10,
          canvas.width,
          20
        );

        if (progress >= 1) {
          ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          ctx.drawImage(
            img,
            0,
            0,
            canvas.width,
            canvas.height
          );

          return;
        }

        animRef.current =
          requestAnimationFrame(animate);
      };

      animRef.current =
        requestAnimationFrame(animate);
    };

    return () => {
      active = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [src, revealKey]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-cyan-400/40"
      style={{
        width: "13rem",
        height: "24rem",
        aspectRatio: "9/16",
        boxShadow:
          "0 0 35px rgba(34,211,238,0.25)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
      />
    </div>
  );
}