import { useState, useEffect } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { playSound } from "../utils/sound";
import { useDecrypt } from "../hooks/useDecrypt";

interface FeedbackSceneProps {
  isVisible: boolean;
  onSubmit: (rating: number, text: string) => void;
  onSkip: () => void;
  nodeId?: string;
}

interface Review {
  id: number;
  user: string;
  rating: number;
  text: string;
  date: string;
}

const INITIAL_REVIEWS: Review[] = [
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

function ReviewCard({ review }: { review: Review }) {
  const decrypted = useDecrypt(review.text, true, 800);

  return (
    <div className="border border-cyan-500/10 bg-black/30 p-3 rounded-md">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-cyan-400/60 font-mono tracking-wider">
          {review.user}
        </span>
        <span className="text-[10px] text-cyan-300 font-mono">
          {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)}
        </span>
      </div>
      <p className="text-slate-400 text-[12px] leading-relaxed font-mono">
        {decrypted}
      </p>
    </div>
  );
}

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
            playSound("/sounds/blip.mp3", 0.3);
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
  nodeId = "471019051",
}: FeedbackSceneProps) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);

  useEffect(() => {
    if (rating > 0 && showError) {
      setShowError(false);
    }
  }, [rating, showError]);

  const handleSubmit = () => {
    if (rating === 0) {
      setShowError(true);
      return;
    }
    const newReview: Review = {
      id: Date.now(),
      user: `node_${nodeId.slice(-4)}`,
      rating,
      text: text || "Без комментария",
      date: new Date().toISOString().split("T")[0],
    };
    setReviews([newReview, ...reviews]);
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
          Спасибо, ваш голос записан в потоке данных.
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
        ОЦЕНИТЬ
      </div>

      <div className="text-slate-300 text-[13px] mb-5 border-l-2 border-cyan-400/40 pl-4">
        Оцените точность расклада. Ваш голос помогает Пифии становиться лучше.
      </div>

      <div className="mb-4">
        <div className="text-[11px] text-slate-500 tracking-widest mb-2">
          ОЦЕНКА:
        </div>
        <StarRating rating={rating} onRate={setRating} />
      </div>

      {showError && (
        <div className="text-[11px] text-rose-400 border border-rose-500/30 bg-rose-500/5 p-2 mb-4 animate-pulse">
          ▸ ОШИБКА: НУЛЕВАЯ СИНХРОНИЗАЦИЯ. ВЫБЕРИТЕ КОЛИЧЕСТВО ЗВЕЗД.
        </div>
      )}

      <div className="mb-5">
        <div className="text-[11px] text-slate-500 tracking-widest mb-2">
          КОММЕНТАРИЙ // НЕОБЯЗАТЕЛЬНО:
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Расскажите, что Пифия угадала..."
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
        >
          [ отправить ]
        </TerminalButton>
        <TerminalButton variant="cancel" onClick={onSkip}>
          [ пропустить ]
        </TerminalButton>
      </div>

      {reviews.length > 0 && (
        <div>
          <div className="text-[11px] text-slate-500 tracking-widest mb-3 border-t border-cyan-500/10 pt-4">
            // ПОСЛЕДНИЕ ОТЗЫВЫ
          </div>
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
