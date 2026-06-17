import { TerminalButton } from "../components/ui/TerminalButton";
import { useDecrypt } from "../hooks/useDecrypt";
import { playSound } from "../utils/sound";

interface Bundle {
  id: string;
  label: string;
  candles: number;
  stars: number;
  originalStars?: number;
  soon?: boolean;
}

const BUNDLES: Bundle[] = [
  { id: "bundle_1", label: "ПАКЕТ_01", candles: 1, stars: 99 },
  {
    id: "bundle_5",
    label: "ПАКЕТ_02",
    candles: 5,
    stars: 399,
    originalStars: 495,
    soon: true,
  },
  {
    id: "bundle_10",
    label: "ПАКЕТ_03",
    candles: 10,
    stars: 699,
    originalStars: 990,
    soon: true,
  },
];

interface TokensSceneProps {
  isVisible: boolean;
  onRecharge: (bundleId: string) => void;
  onCancel: () => void;
}

export function TokensScene({
  isVisible,
  onRecharge,
  onCancel,
}: TokensSceneProps) {
  const header = useDecrypt("ТОКЕНЫ // МАГАЗИН", isVisible, 800);
  const info = useDecrypt(
    "Выбери количество токенов для пополнения баланса. Каждый токен — 1 расклад Кельтского Креста.",
    isVisible,
    1000,
  );

  if (!isVisible) return null;

  return (
    <div>
      <div className="text-sm text-cyan-400/60 tracking-widest mb-3 uppercase">
        {header}
      </div>
      <div className="leading-relaxed text-slate-300 mb-5 border-l-2 border-cyan-400/40 pl-4 text-[14px]">
        {info}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {BUNDLES.map((b) => {
          const discount = b.originalStars
            ? Math.round((1 - b.stars / b.originalStars) * 100)
            : 0;

          return (
            <button
              key={b.id}
              onClick={() => {
                if (!b.soon) {
                  playSound("/sounds/start.mp3", 0.5);
                  onRecharge(b.id);
                }
              }}
              disabled={b.soon}
              className={`group relative w-full py-4 px-4 font-mono text-xs bg-black border rounded-md overflow-hidden transition-all duration-300 ${
                b.soon
                  ? "border-slate-700/30 opacity-50 cursor-not-allowed"
                  : "border-cyan-400/30 active:scale-[0.97] hover:border-cyan-400/60 hover:shadow-[0_0_16px_rgba(34,211,238,0.15)]"
              }`}
            >
              {!b.soon && (
                <span className="absolute inset-0 overflow-hidden">
                  <span className="absolute top-0 left-[-130%] w-full h-full bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent group-hover:animate-[scan_1s_linear]" />
                </span>
              )}
              <span className={`absolute bottom-0 left-0 w-full h-[1px] ${b.soon ? "bg-slate-700/30" : "bg-cyan-300/30 opacity-60 group-hover:opacity-100"} transition`} />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex flex-col items-start gap-1">
                  <span className={`tracking-[0.3em] font-bold ${b.soon ? "text-slate-600" : "text-cyan-300"}`}>
                    [{b.label}]
                  </span>
                  <span className="text-[10px] text-slate-500 tracking-wider">
                    {b.candles} ТОКЕН{b.candles > 1 ? (b.candles > 4 ? "ОВ" : "А") : ""}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {b.soon ? (
                    <span className="text-[10px] text-slate-600 border border-slate-700/40 px-2 py-[2px] tracking-widest">
                      СКОРО
                    </span>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {b.originalStars && (
                          <span className="text-[10px] text-slate-600 line-through">
                            {b.originalStars}
                          </span>
                        )}
                        <span className="text-cyan-200 font-bold tracking-wider">
                          {b.stars} ★
                        </span>
                      </div>
                      {discount > 0 && (
                        <span className="text-[9px] font-mono text-emerald-400 border border-emerald-500/30 px-1.5 py-[1px] tracking-widest">
                          СКИДКА {discount}%
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <TerminalButton variant="cancel" onClick={onCancel}>
        [ отмена ]
      </TerminalButton>
    </div>
  );
}
