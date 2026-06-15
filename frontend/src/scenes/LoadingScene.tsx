import { useEffect } from "react";
import { Ouroboros } from "../components/ui/Ouroboros";
import { TerminalButton } from "../components/ui/TerminalButton";
import { playSound } from "../utils/sound";

interface LoadingSceneProps {
  isVisible: boolean;
  loadingStatus: string;
  apiDone: boolean;
  canProceed: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export function LoadingScene({
  isVisible,
  loadingStatus,
  apiDone,
  canProceed,
  onComplete,
}: LoadingSceneProps) {
  useEffect(() => {
    if (apiDone) {
      playSound("/sounds/decript.mp3", 0.5);
    }
  }, [apiDone]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full text-xs text-cyan-400/50 tracking-[0.4em] uppercase mb-6 text-center">
        {loadingStatus}
        <span className="animate-pulse">...</span>
      </div>
      <div className="mb-4">
        <Ouroboros />
      </div>
      <p className="text-slate-500 text-xs tracking-widest uppercase mb-8 text-center animate-pulse">
        Пифия читает твой вектор
      </p>
      <div className="w-full flex items-center gap-2 mb-8 text-xs">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-500 ${
            apiDone
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
              : "bg-slate-700 animate-pulse"
          }`}
        />
        <span
          className={`tracking-widest transition-colors duration-500 ${
            apiDone ? "text-emerald-400" : "text-slate-600"
          }`}
        >
          {apiDone ? "ORACLE_RESPONSE: RECEIVED" : "ORACLE_RESPONSE: PENDING"}
        </span>
      </div>
      <div className="flex flex-col gap-3 w-full">
        <TerminalButton
          variant="primary"
          disabled={!canProceed}
          onClick={onComplete}
        >
          {canProceed ? "[ next ]" : "[ next // ожидание ]"}
        </TerminalButton>
      </div>
    </div>
  );
}