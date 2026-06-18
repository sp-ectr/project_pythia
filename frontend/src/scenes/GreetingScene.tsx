import { useEffect } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { Cursor } from "../components/ui/Cursor";
import { playSound } from "../utils/sound";

interface GreetingSceneProps {
  isVisible: boolean;
  onStart: () => void;
  onCancel: () => void;
  onShowProtocol: () => void;
  oracleGreeting: string;
  greetingDone: boolean;
  setOracleGreeting: (val: string) => void;
  setGreetingDone: (val: boolean) => void;
}

export function GreetingScene({
  isVisible,
  onStart,
  onCancel,
  onShowProtocol,
  oracleGreeting,
  greetingDone,
  setOracleGreeting,
  setGreetingDone,
}: GreetingSceneProps) {
  useEffect(() => {
    if (!isVisible) return;

    setOracleGreeting("");
    setGreetingDone(false);

    const fullGreeting = `Ваш цифровой отпечаток найден в потоке. Пифия готова развернуть для вас Кельтский Крест — древний алгоритм истины.\n\nСосредоточьтесь. У вас есть лишь один шанс за этот цикл, чтобы заглянуть за пелену кода.`;

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    let mounted = true;

    const type = () => {
      if (!mounted) return;
      if (i < fullGreeting.length) {
        setOracleGreeting(fullGreeting.slice(0, i + 1));
        if (fullGreeting[i] !== " " && fullGreeting[i] !== "\n") {
          playSound("/sounds/blip.mp3", 0.1);
        }
        i++;
        timer = setTimeout(type, 65);
      } else {
        setGreetingDone(true);
      }
    };

    timer = setTimeout(type, 300);
    return () => { mounted = false; clearTimeout(timer); };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
  <div>
    <div className="leading-relaxed text-slate-200 mb-6 border-l-2 border-cyan-400/60 pl-4 text-[14.5px] whitespace-pre-wrap">
      {oracleGreeting}
      <Cursor isBlinking={greetingDone} />
    </div>

    {greetingDone && (
      <>
        <div className="flex flex-col gap-3">
          <TerminalButton variant="primary" onClick={onStart}>
            [ начать ]
          </TerminalButton>

          <TerminalButton variant="cancel" onClick={onCancel}>
            [ отмена ]
          </TerminalButton>

          <button
            onClick={() => {
              playSound("/sounds/start.mp3", 0.5);
              onShowProtocol();
            }}
            className="text-center text-cyan-300/70 hover:text-cyan-300 transition-colors text-[11px]"
          >
            [ нажимая, вы принимаете протокол ]
          </button>
        </div>
      </>
    )}
  </div>
);
}
