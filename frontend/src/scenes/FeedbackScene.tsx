import { useState } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { playSound } from "../utils/sound";

interface FeedbackSceneProps {
  isVisible: boolean;
  onSubmit: (rating: number, text: string) => void;
  onSkip: () => void;
}

const MOCK_REVIEWS = [
  {
    id: 1,
    user: "node_7721",
    rating: 5,
    text: "Пифия точно попала в ситуацию на работе. Интерпретация карт поразительно точная.",
    date: "2026-06-10",
  },
  {
    id: 2,
    user: "node_3304",
    rating: 4,
    text: "Прикольный формат, напомнило мне про то, что пора менять работу. Спасибо.",
    date: "2026-06-09",
  },
  {
    id: 3,
    user: "node_5588",
    rating: 5,
    text: "Расклад оказался очень точным. Захожу уже третий раз.",
    date: "2026-06-08",
  },
];

function StarRating({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-2 mb-4">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => {
            playSound("/sounds/decript.mp3", 0.4);
            onRate(n);
          }}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className={`text-2xl font-mono transition-all duration-150 ${
            n <= (hovered || rating)
              ? "text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
              : "text-slate-700"
          }`}
        >
          {n <= (hovered || rating) ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export function FeedbackScene({
  isVisible,
  onSubmit,
  onSkip,
}: FeedbackSceneProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    setSubmitted(true);
    onSubmit(rating, text);
  };

  if (!isVisible) return null;

  if (submitted) {
    return (
      <div className="text-center">
        <div className="text-sm text-cyan-400/60 tracking-widest mb-3 uppercase">
          ОТЗЫВ // ОТПРАВЛЕН
        </div>
        <div className="text-slate-300 text-[14px] mb-6">
          Спасибо, твой голос записан в потоке данных.
        </div>
        <TerminalButton variant="primary" onClick={onSkip}>
          [ завершить ]
        </TerminalButton>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm text-cyan-400/60 tracking-widest mb-3 uppercase">
        ОЦЕНИ СЕАНС
      </div>

      <div className="text-slate-300 text-[13px] mb-5 border-l-2 border-cyan-400/40 pl-4">
        Оцени точность расклада. Твой голос помогает Пифии становится лучше.
      </div>

      <div className="mb-4">
        <div className="text-[11px] text-slate-500 tracking-widest mb-2">
          ОЦЕНКА:
        </div>
        <StarRating rating={rating} onRate={setRating} />
      </div>

      <div className="mb-5">
        <div className="text-[11px] text-slate-500 tracking-widest mb-2">
          КОММЕНТАРИЙ // НЕОБЯЗАТЕЛЬНО:
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Расскажи, что Пифия угадала..."
          rows={3}
          maxLength={200}
          className="w-full bg-black border border-cyan-500/20 text-slate-200 text-[13px] leading-relaxed placeholder:text-slate-600 resize-none outline-none p-3 font-mono tracking-wide caret-cyan-400 rounded-md"
        />
        <div className="text-[10px] text-slate-600 text-right">
          {text.length} / 200
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <TerminalButton
          variant="primary"
          onClick={handleSubmit}
          disabled={rating === 0}
        >
          [ отправить ]
        </TerminalButton>
        <TerminalButton variant="cancel" onClick={onSkip}>
          [ пропустить ]
        </TerminalButton>
      </div>

      {MOCK_REVIEWS.length > 0 && (
        <div>
          <div className="text-[11px] text-slate-500 tracking-widest mb-3 border-t border-cyan-500/10 pt-4">
            // ПОСЛЕДНИЕ ОТЗЫВЫ
          </div>
          <div className="flex flex-col gap-3">
            {MOCK_REVIEWS.map((r) => (
              <div
                key={r.id}
                className="border border-cyan-500/10 bg-black/30 p-3 rounded-md"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-cyan-400/60 font-mono tracking-wider">
                    {r.user}
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                <p className="text-slate-400 text-[12px] leading-relaxed">
                  {r.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
