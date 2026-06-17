import { useEffect, useRef } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { Cursor } from "../components/ui/Cursor";
import { playSound } from "../utils/sound";

interface InputSceneProps {
  isVisible: boolean;
  onAsk: (question: string) => void;
  inputIntroText: string;
  inputIntroDone: boolean;
  setInputIntroText: (val: string) => void;
  setInputIntroDone: (val: boolean) => void;
  inputMode: "choose" | "voice" | "text";
  setInputMode: (val: "choose" | "voice" | "text") => void;
  textQuestion: string;
  setTextQuestion: (val: string) => void;
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

  useEffect(() => {
    if (!isVisible) return;
    setInputIntroText("");
    setInputIntroDone(false);
    const fullIntro = `Пифия не принимает решений за смертных.\nОна лишь приоткрывает завесу.\n\nКак вы хотите задать свой вопрос?`;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const type = () => {
      if (i < fullIntro.length) {
        setInputIntroText(fullIntro.slice(0, i + 1));
        if (fullIntro[i] !== " " && fullIntro[i] !== "\n") {
          playSound("/sounds/blip.mp3", 0.1);
        }
        i++;
        timer = setTimeout(type, 65);
      } else {
        setInputIntroDone(true);
      }
    };
    timer = setTimeout(type, 300);
    return () => clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    if (inputMode === "text" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [inputMode]);

  if (!isVisible) return null;

  return (
    <div>
      <div className="leading-relaxed text-slate-200 mb-6 border-l-2 border-cyan-400/30 pl-4 text-[14px] whitespace-pre-wrap">
        {inputIntroText}
        {!inputIntroDone && <Cursor isBlinking={true} />}
      </div>

      {inputIntroDone && (
        <>
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

          {inputMode === "text" && (
            <div className="flex flex-col gap-3 w-full">
              <div className="border border-cyan-500/30 bg-black/60 p-1 relative">
                <textarea
                  ref={textareaRef}
                  value={textQuestion}
                  onChange={(e) => setTextQuestion(e.target.value)}
                  placeholder="Введите ваш вопрос..."
                  rows={4}
                  maxLength={100}
                  className="w-full bg-transparent text-slate-200 text-[13.5px] leading-relaxed placeholder:text-slate-600 resize-none outline-none p-3 pb-8 font-mono tracking-wide caret-cyan-400"
                />
                <div className="absolute bottom-2 right-3 text-[10px] font-mono text-cyan-400/40">
                  {textQuestion.length} / 100
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    if (textQuestion.trim() && textQuestion.length <= 100) {
                      playSound("/sounds/start.mp3", 0.5);
                      onAsk(textQuestion);
                    }
                  }}
                  disabled={!textQuestion.trim() || textQuestion.length > 100}
                  className={`flex-1 py-4 font-mono uppercase tracking-[0.35em] text-xs border rounded-md transition-all duration-300 active:scale-[0.97] ${
                    textQuestion.trim() && textQuestion.length <= 100
                      ? "border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                      : "border-slate-700/40 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  [ спросить ]
                </button>
                <button
                  onClick={() => {
                    playSound("/sounds/cancel.mp3", 0.5);
                    setTextQuestion("");
                    setInputMode("choose");
                  }}
                  className="flex-1 py-4 font-mono uppercase tracking-[0.35em] text-xs border border-slate-600/50 text-slate-500 rounded-md transition-all duration-300 active:scale-[0.97]"
                >
                  [ отмена ]
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
