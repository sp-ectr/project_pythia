import { useState, useEffect} from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { Cursor } from "../components/ui/Cursor";
import { useDecrypt } from "../hooks/useDecrypt";
import { CardReveal } from "../components/ui/CardReveal";
import { playSound } from "../utils/sound";
import backImg from "../assets/back.webp";

const POSITION_TITLES: Record<number, string> = {
  1: "1 — Где ты находишься сейчас",
  2: "2 — Что помогает или мешает",
  3: "3 — Откуда идут корни ситуации",
  4: "4 — Что осталось позади",
  5: "5 — К чему стремится твоя душа",
  6: "6 — Что ждет впереди",
  7: "7 — Что происходит внутри тебя",
  8: "8 — Что происходит вокруг тебя",
  9: "9 — Чего ты боишься и на что надеешься",
  10: "10 — К чему ведет этот путь",
};

interface CardInterpretation {
  position: number;
  position_explanation: string;
  card_id: number;
  card_name: string;
  is_reversed: boolean;
  text: string;
}

interface ResultSceneProps {
  isVisible: boolean;
  cards: CardInterpretation[];
  intro?: string;
  conclusion?: string;
  refusalReason?: string | null;
  strikes?: number;
  onScrollToTop?: () => void;
  onShowFeedback?: () => void;
  onReset: () => void;
}

type StepState =
  | "oracle_intro"
  | "card_intro"
  | "card_reading"
  | "oracle_conclusion";

const getCipherPlaceholder = (text: string) => {
  return text
    .split("")
    .map(() => "▓")
    .join("");
};

export function ResultScene({
  isVisible,
  cards,
  intro,
  conclusion,
  refusalReason,
  strikes = 0,
  onScrollToTop,
  onShowFeedback,
  onReset,
}: ResultSceneProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<StepState>("oracle_intro");
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  const card = cards[currentIndex];

  const isPureText = step === "oracle_intro" || step === "oracle_conclusion";

  const progressPercent =
    step === "oracle_intro"
      ? 0
      : step === "oracle_conclusion"
        ? 100
        : Math.round(
            ((currentIndex + (step === "card_reading" ? 0.7 : 0.3)) /
              cards.length) *
              90 +
              5,
          );

  const shouldDecryptReading = isVisible && step === "card_reading";
  const decryptedReading = useDecrypt(card.text, shouldDecryptReading, 1000);
  const shouldDecryptName = isVisible && step === "card_reading";
  const decryptedCardName = useDecrypt(
    card.card_name.toUpperCase(),
    shouldDecryptName,
    600,
  );

  const handleNext = () => {
    onScrollToTop?.();
    if (step === "oracle_intro") {
      setStep("card_intro");
    } else if (step === "card_intro") {
      setStep("card_reading");
    } else if (step === "card_reading") {
      if (currentIndex < cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setStep("card_intro");
      } else {
        setStep("oracle_conclusion");
      }
    } else if (step === "oracle_conclusion") {
      onShowFeedback ? onShowFeedback() : onReset();
    }
  };

  const handlePrev = () => {
    onScrollToTop?.();
    if (step === "card_intro") {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
        setStep("card_reading");
      } else {
        setStep("oracle_intro");
      }
    } else if (step === "card_reading") {
      setStep("card_intro");
    } else if (step === "oracle_conclusion") {
      setCurrentIndex(cards.length - 1);
      setStep("card_reading");
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    if (step === "card_reading") return;

    setDisplayedTitle("");
    setDisplayedText("");
    setTypingDone(false);

    let activeTitle = "";
    let activeText = "";

    if (step === "oracle_intro") {
      activeTitle = "🔮 ТВОЕ ПОСЛАНИЕ ОТ ПИФИИ";
      activeText = intro || "";
    } else if (step === "card_intro") {
      activeTitle = POSITION_TITLES[card.position] || "";
      activeText = card.position_explanation || "";
    } else if (step === "oracle_conclusion") {
      activeTitle = "✨ ФИНАЛЬНЫЙ ВЕРДИКТ ПИФИИ";
      activeText = conclusion || "";
    }

    let titleIdx = 0;
    let textIdx = 0;

    let titleTimer: ReturnType<typeof setInterval>;
    let textTimer: ReturnType<typeof setInterval>;

    titleTimer = setInterval(() => {
      if (titleIdx < activeTitle.length) {
        setDisplayedTitle(activeTitle.slice(0, titleIdx + 1));
        if (activeTitle[titleIdx] !== " ") {
          playSound("/sounds/blip.mp3", 0.1);
        }
        titleIdx++;
      } else {
        clearInterval(titleTimer);
        textTimer = setInterval(() => {
          if (textIdx < activeText.length) {
            setDisplayedText(activeText.slice(0, textIdx + 1));
            if (activeText[textIdx] !== " " && activeText[textIdx] !== "\n") {
              playSound("/sounds/blip.mp3", 0.1);
            }
            textIdx++;
          } else {
            clearInterval(textTimer);
            setTypingDone(true);
          }
        }, 30);
      }
    }, 40);

    return () => {
      clearInterval(titleTimer);
      clearInterval(textTimer);
    };
  }, [currentIndex, isVisible, step, card?.position, intro, conclusion]);

  if (!isVisible) return null;

  if (refusalReason) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="text-sm text-rose-400/80 tracking-widest uppercase mb-4 animate-pulse">
            ▸ ДОСТУП ЗАКРЫТ
          </div>
          <div className="border border-rose-500/30 bg-rose-950/20 p-6 rounded-md mb-6">
            <p className="text-rose-300/80 text-[13px] font-mono leading-relaxed tracking-wide">
              {refusalReason}
            </p>
          </div>
          {strikes > 0 && strikes < 3 && (
            <div className="border border-amber-500/30 bg-amber-950/20 p-4 rounded-md mb-4">
              <p className="text-amber-300/80 text-[12px] font-mono leading-relaxed tracking-wide">
                ▸ ПРЕДУПРЕЖДЕНИЕ: {strikes} / 3 нарушения.
              </p>
              <p className="text-amber-400/60 text-[11px] font-mono tracking-wider mt-1">
                При достижении лимита доступ будет перманентно заблокирован.
              </p>
            </div>
          )}
          {strikes >= 3 && (
            <div className="border border-rose-500/50 bg-rose-950/40 p-4 rounded-md mb-4">
              <p className="text-rose-300 text-[12px] font-mono leading-relaxed tracking-wide animate-pulse">
                ▸ ПЕРМАНЕНТНАЯ БЛОКИРОВКА АКТИВИРОВАНА
              </p>
            </div>
          )}
          <p className="text-slate-500 text-[11px] font-mono tracking-wider mb-8">
            Ваш баланс не изменён.
          </p>
          <TerminalButton variant="cancel" onClick={onReset}>
            [ вернуться ]
          </TerminalButton>
        </div>
      </div>
    );
  }

  const showCard = step === "card_intro" || step === "card_reading";

  return (
    <div
      className="h-full flex flex-col items-center w-full overflow-y-auto"
    >
      <div className="w-full mb-4 h-[2px] bg-cyan-500/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progressPercent}%`,
            background: "linear-gradient(90deg, #22d3ee, #a78bfa)",
          }}
        />
      </div>

      <div className="border border-cyan-500/30 bg-black/70 p-3 mb-4 w-full text-center text-xs font-mono tracking-[0.5px] text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)] min-h-[42px] flex items-center justify-center font-bold">
        <span>
          {step === "card_reading"
            ? POSITION_TITLES[card.position]
            : displayedTitle}
        </span>
        {(step === "oracle_intro" ||
          step === "card_intro" ||
          step === "oracle_conclusion") &&
          !typingDone && (
            <span className="inline-block w-[2px] h-[10px] bg-cyan-400 ml-1 animate-pulse" />
          )}
      </div>

      {showCard && (
        <div className="flex items-center justify-center gap-2 mb-4 w-full flex-wrap">
          <span className="text-[10px] font-mono text-cyan-400/60 border border-cyan-500/25 px-2 py-[2px] tracking-widest">
            {currentIndex + 1} / {cards.length}
          </span>
          <span className="text-cyan-300 text-sm font-bold font-mono tracking-widest drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
            [{" "}
            {step === "card_intro"
              ? getCipherPlaceholder(card.card_name)
              : decryptedCardName}{" "}
            ]
          </span>
          {card.is_reversed && step === "card_reading" && (
            <span className="text-[10px] font-mono font-black text-rose-500 border border-rose-500/35 px-2 py-[2px] tracking-widest drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]">
              REVERSED
            </span>
          )}
        </div>
      )}

      {showCard && (
        <div className="mb-4 flex justify-center">
          {step === "card_intro" ? (
            <div
              className={`relative rounded-lg border ${
                card.is_reversed ? "border-rose-500/70" : "border-cyan-400/80"
              } overflow-hidden`}
              style={{
                width: "13rem",
                height: "24rem",
                aspectRatio: "9/16",
                boxShadow: card.is_reversed
                  ? "0 0 20px rgba(244,63,94,0.45), inset 0 0 10px rgba(244,63,94,0.15)"
                  : "0 0 20px rgba(34,211,238,0.45), inset 0 0 10px rgba(34,211,238,0.15)",
                transition: "box-shadow 0.8s ease",
              }}
            >
              <img
                src={backImg}
                alt="Card Back"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <CardReveal
              key={`${currentIndex}-${step}`}
              revealKey={`${currentIndex}-${step}`}
              src={`/cards/${card.card_id}.webp`}
              alt={card.card_name}
              isReversed={card.is_reversed}
            />
          )}
        </div>
      )}

      <div
        className={`leading-7 text-slate-300 text-[15px] border-l-2 border-cyan-500/40 pl-4 mb-5 w-full whitespace-pre-wrap overflow-hidden font-mono ${
          isPureText ? "min-h-0" : "min-h-[110px] flex-1"
        }`}
      >
        {step === "card_reading" ? decryptedReading : displayedText}
        <Cursor
          isBlinking={
            step === "card_reading"
              ? decryptedReading === card.text
              : typingDone
          }
        />
      </div>

      <div className={`flex gap-3 w-full ${isPureText ? "mt-6" : "mt-auto"}`}>
        {step !== "oracle_intro" && (
          <TerminalButton variant="cancel" onClick={handlePrev} disabled={!typingDone}>
            [ назад ]
          </TerminalButton>
        )}
        <TerminalButton variant="primary" onClick={handleNext} disabled={!typingDone}>
          {step === "oracle_intro"
            ? "[ раскрыть расклад ]"
            : step === "card_intro"
              ? "[ открыть ]"
              : step === "card_reading" && currentIndex === cards.length - 1
                ? "[ показать итог ]"
                : step === "oracle_conclusion"
                  ? onShowFeedback ? "[ оценить сеанс ]" : "[ завершить ]"
                  : "[ далее ]"}
        </TerminalButton>
      </div>
    </div>
  );
}
