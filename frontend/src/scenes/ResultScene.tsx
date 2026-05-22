import { useState, useEffect } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { Cursor } from "../components/ui/Cursor";
import { GlitchCard } from "../components/core/GlitchCard";
import { useDecrypt } from "../hooks/useDecrypt";

// Описываем, какие данные сцена должна получить на вход
interface CardInterpretation {
  position: number;
  position_meaning: string;
  card_id: number;
  card_name: string;
  is_reversed: boolean;
  text: string;
}

interface ResultSceneProps {
  isVisible: boolean;
  cards: CardInterpretation[]; // Передаем массив из 10 карт
  onReset: () => void;         // Коллбэк для возврата на HOME
}


export function ResultScene({ isVisible, cards, onReset }: ResultSceneProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  const card = cards[currentIndex];

  const rawTitle = `${card.position}. ${card.position_meaning.toUpperCase()}: ${card.card_name.toUpperCase()}${card.is_reversed ? " (REVERSED)" : ""}`;
  const decryptedTitle = useDecrypt(rawTitle, isVisible, 500);

  useEffect(() => {
    if (!isVisible) return;

    setDisplayedText("");
    setTypingDone(false);

    let i = 0;
    const fullText = card.text;

    const timer = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText((prev) => prev + fullText[i]);
        i++;
      } else {
        setTypingDone(true);
        clearInterval(timer);
      }
    }, 30); // Скорость печати (30мс на символ)

    return () => clearInterval(timer);
  }, [currentIndex, isVisible, card.text]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col items-center w-full">
      
      {/* Карта сверху (пока просто GlitchCard, анимации накрутим на Шаге 4) */}
      <div key={currentIndex} className="mb-6 flex justify-center animate-materialize">
        <GlitchCard cardId={card.card_id} />
      </div>

      {/* Decrypt-заголовок */}
      <div className="text-cyan-400 text-xs tracking-[0.2em] uppercase mb-4 text-center font-bold">
        {decryptedTitle}
      </div>

      {/* Текст интерпретации с курсором */}
      <div className="leading-relaxed text-slate-300 text-[13.5px] border-l border-cyan-500/30 pl-4 mb-8 min-h-[140px] w-full whitespace-pre-wrap">
        {displayedText}
        <Cursor isBlinking={typingDone} />
      </div>

      {/* Кнопки навигации */}
      <div className="flex gap-3 w-full">
        {currentIndex > 0 ? (
          <TerminalButton variant="cancel" onClick={() => setCurrentIndex((prev) => prev - 1)}>
            [ prev ]
          </TerminalButton>
        ) : (
          // Если это первая карта, кнопка "Назад" возвращает нас в HOME
          <TerminalButton variant="danger" onClick={onReset}>
            [ exit ]
          </TerminalButton>
        )}

        {currentIndex < cards.length - 1 ? (
          <TerminalButton variant="primary" onClick={() => setCurrentIndex((prev) => prev + 1)}>
            [ next ]
          </TerminalButton>
        ) : (
          // На последней карте предлагаем закончить сессию
          <TerminalButton variant="primary" onClick={onReset}>
            [ finish ]
          </TerminalButton>
        )}
      </div>
    </div>
  );
}