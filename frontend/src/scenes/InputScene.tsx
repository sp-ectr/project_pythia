import { useEffect, useRef } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { Cursor } from "../components/ui/Cursor";

interface InputSceneProps {
  isVisible: boolean;
  onAsk: (question: string) => void;
  // Текст intro
  inputIntroText: string;
  inputIntroDone: boolean;
  setInputIntroText: (val: string) => void;
  setInputIntroDone: (val: boolean) => void;
  // Режим ввода
  inputMode: "choose" | "voice" | "text";
  setInputMode: (val: "choose" | "voice" | "text") => void;
  // Текстовый вопрос
  textQuestion: string;
  setTextQuestion: (val: string) => void;
  // Голосовое управление
  isRecording: boolean;
  recordingError: string;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
}

export function InputScene({
  isVisible,
  onAsk,
  inputIntroText,
  inputIntroDone,
  setInputIntroText,
  setInputIntroDone,
  inputMode,
  setInputMode,
  textQuestion,
  setTextQuestion,
  isRecording,
  recordingError,
  onVoiceStart,
  onVoiceStop,
}: InputSceneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Печать intro
  useEffect(() => {
    if (!isVisible) return;
    setInputIntroText("");
    setInputIntroDone(false);
    const fullIntro = `Закройте глаза.\nУспокойте свой разум.\n\nКак вы хотите задать свой вопрос?`;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const type = () => {
      if (i < fullIntro.length) {
        setInputIntroText(fullIntro.slice(0, i + 1));
        i++;
        timer = setTimeout(type, 45);
      } else {
        setInputIntroDone(true);
      }
    };
    timer = setTimeout(type, 300);
    return () => clearTimeout(timer);
  }, [isVisible]);

  // Автофокус на textarea
  useEffect(() => {
    if (inputMode === "text" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [inputMode]);

  if (!isVisible) return null;

  return (
    <div>
      {/* Блок с печатающимся текстом */}
      <div className="leading-relaxed text-slate-200 mb-6 border-l-2 border-cyan-400/30 pl-4 text-[14px] whitespace-pre-wrap">
        {inputIntroText}
        {!inputIntroDone && <Cursor isBlinking={true} />}
      </div>

      {inputIntroDone && (
        <>
          {/* Выбор способа ввода */}
          {inputMode === "choose" && (
            <div className="flex flex-col gap-3">
              {recordingError && (
                <div className="text-rose-400 text-xs border border-rose-500/30 bg-rose-500/5 p-3 mb-1 tracking-wide">
                  ▸ {recordingError}
                </div>
              )}
              <TerminalButton variant="primary" onClick={onVoiceStart}>
                [ голосом ]
              </TerminalButton>
              <TerminalButton
                variant="cancel"
                onClick={() => setInputMode("text")}
              >
                [ текстом ]
              </TerminalButton>
            </div>
          )}

          {/* Голосовой режим */}
          {inputMode === "voice" && (
            <div className="flex flex-col gap-3">
              <div className="border border-cyan-500/30 bg-black/60 p-4 text-center">
                {isRecording ? (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="inline-block w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-rose-400 text-xs tracking-widest uppercase">
                        REC // ЗАПИСЬ
                      </span>
                    </div>
                    <div className="flex justify-center gap-1 mb-4">
                      {[...Array(12)].map((_, i) => (
                        <span
                          key={i}
                          className="inline-block w-[3px] bg-cyan-400/60 rounded-full"
                          style={{
                            height: `${8 + Math.random() * 20}px`,
                            animation: `pulse ${0.4 + Math.random() * 0.6}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.07}s`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-slate-400 text-xs tracking-wider">
                      Говорите. Пифия слушает...
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500 text-xs tracking-wider">
                    Обработка сигнала...
                  </p>
                )}
              </div>
              {isRecording && (
                <TerminalButton variant="danger" onClick={onVoiceStop}>
                  [ стоп ]
                </TerminalButton>
              )}
              <TerminalButton
                variant="cancel"
                onClick={() => {
                  onVoiceStop(); // остановить, если запись идёт
                  setInputMode("choose");
                }}
              >
                [ отмена ]
              </TerminalButton>
            </div>
          )}

          {/* Текстовый режим */}
          {inputMode === "text" && (
            <div className="flex flex-col gap-3">
              <div className="border border-cyan-500/30 bg-black/60 p-1">
                <textarea
                  ref={textareaRef}
                  value={textQuestion}
                  onChange={(e) => setTextQuestion(e.target.value)}
                  placeholder="Введите ваш вопрос..."
                  rows={4}
                  className="w-full bg-transparent text-slate-200 text-[13.5px] leading-relaxed placeholder:text-slate-600 resize-none outline-none p-3 font-mono tracking-wide caret-cyan-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (textQuestion.trim()) onAsk(textQuestion);
                  }}
                  disabled={!textQuestion.trim()}
                  className={`flex-1 py-4 font-mono uppercase tracking-[0.35em] text-xs border rounded-md transition-all duration-300 active:scale-[0.97] ${
                    textQuestion.trim()
                      ? "border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                      : "border-slate-700/40 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  [ ask ]
                </button>
                <button
                  onClick={() => {
                    setTextQuestion("");
                    setInputMode("choose");
                  }}
                  className="flex-1 py-4 font-mono uppercase tracking-[0.35em] text-xs border border-slate-600/50 text-slate-500 rounded-md transition-all duration-300 active:scale-[0.97]"
                >
                  [ cancel ]
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
