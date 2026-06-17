import { useEffect } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { useDecrypt } from "../hooks/useDecrypt";
import { playSound } from "../utils/sound";

interface WarningSceneProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onShowRules: () => void;
  oracleWarning: string;
  warningDone: boolean;
  setOracleWarning: (val: string) => void;
  setWarningDone: (val: boolean) => void;
}

export function WarningScene({
  isVisible,
  onConfirm,
  onCancel,
  onShowRules,
  warningDone,
  setOracleWarning,
  setWarningDone,
}: WarningSceneProps) {
  const fullWarning = `Помни: Матрица не терпит праздности. На бессмысленный шум или тьму в словах Оракул ответит молчанием, а твой доступ будет ограничен.\n\nСформулируй свой запрос вдумчиво.\nУважая:`;

  const decryptedText = useDecrypt(fullWarning, isVisible, 1000);

  useEffect(() => {
    if (!isVisible) return;
    setOracleWarning(decryptedText);
    if (decryptedText === fullWarning) {
      setWarningDone(true);
    } else {
      setWarningDone(false);
    }
  }, [decryptedText, isVisible, fullWarning, setOracleWarning, setWarningDone]);

  if (!isVisible) return null;

  // Разбиваем текст на строки для размещения кнопки напротив последней строки
  const lines = decryptedText.split("\n");
  const lastLine = lines.pop() || "";
  const restText = lines.join("\n");

  return (
    <div>
      <div className="leading-relaxed text-slate-200 mb-6 border-l-2 border-rose-400/60 pl-4 text-[15px] whitespace-pre-wrap">
        {restText}
        {restText && <br />}
        <div className="flex justify-start mb-4">
          <span>{lastLine}</span>
          {warningDone && (
            <button
              onClick={() => {
                playSound("/sounds/start.mp3", 0.5);
                onShowRules();
              }}
              className="text-rose-400/90 hover:text-rose-300 underline decoration-dotted underline-offset-4 text-sm"
            >
              [ ПРАВИЛА_ТЕРМИНАЛА ]
            </button>
          )}
        </div>
      </div>

      {warningDone && (
        <div className="flex flex-col gap-3">
          <TerminalButton variant="primary" onClick={onConfirm}>
            [ подтвердить ]
          </TerminalButton>
          <TerminalButton variant="cancel" onClick={onCancel}>
            [ отмена ]
          </TerminalButton>
        </div>
      )}
    </div>
  );
}
