import { useEffect, useState } from "react";
import { TerminalButton } from "../components/ui/TerminalButton";
import { fetchHistory, type AskPythiaResponse } from "../services/oracleApi";

interface HistorySceneProps {
  isVisible: boolean;
  onSelectReading: (reading: AskPythiaResponse) => void;
  onBack: () => void;
}

export function HistoryScene({ isVisible, onSelectReading, onBack }: HistorySceneProps) {
  const [historyList, setHistoryList] = useState<AskPythiaResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isVisible) return;
    setLoading(true);
    fetchHistory(10, 0)
      .then((data) => {
        setHistoryList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch history:", err);
        setLoading(false);
      });
  }, [isVisible]);

  if (!isVisible) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="text-sm text-cyan-400/60 tracking-widest mb-3 uppercase">
        СЕАНСЫ // АРХИВ_ВЕКТОРОВ
      </div>

      <div className="text-slate-300 text-[13px] mb-5 border-l-2 border-cyan-400/40 pl-4">
        Здесь хранятся твои прошлые консультации с Оракулом. Выбери сеанс, чтобы перечитать послание Пифии.
      </div>

      {loading ? (
        <div className="text-center py-8 text-cyan-400/50 animate-pulse uppercase tracking-widest text-xs">
          ▸ Сканирование базы данных...
        </div>
      ) : historyList.length === 0 ? (
        <div className="text-center py-8 text-slate-500 tracking-wider text-xs">
          ▸ Архив пуст. Вы ещё не совершали раскладов в этом цикле.
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6 max-h-[380px] overflow-y-auto pr-1">
          {historyList.map((h, index) => {
            const questionText = h.interpretation?.intro || "Поиск вектора...";
            const firstCard = h.interpretation?.cards_interpretation?.[0]?.card_name || "Расклад";

            return (
              <button
                key={h.reading_id || index}
                onClick={() => onSelectReading(h)}
                className="group relative w-full text-left py-3 px-4 font-mono text-xs bg-black border border-cyan-500/20 rounded-md overflow-hidden transition hover:border-cyan-400/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.08)] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-1 text-[10px] text-cyan-400/60">
                  <span>{formatDate(h.created_at)}</span>
                  <span className="text-cyan-300">[{firstCard}]</span>
                </div>
                <div className="text-slate-300 text-[11px] truncate tracking-wide">
                  ▸ {questionText.slice(0, 50)}...
                </div>
              </button>
            );
          })}
        </div>
      )}

      <TerminalButton variant="cancel" onClick={onBack}>
        [ назад ]
      </TerminalButton>
    </div>
  );
}
