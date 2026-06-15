import { TerminalButton } from "../components/ui/TerminalButton";
import { useDecrypt } from "../hooks/useDecrypt";
import { playSound } from "../utils/sound";

interface Bundle {
  id: string;
  label: string;
  candles: number;
  stars: number;
  originalStars?: number;
}

const BUNDLES: Bundle[] = [
  { id: "bundle_1", label: "BUNDLE_01", candles: 1, stars: 99 },
  {
    id: "bundle_5",
    label: "BUNDLE_02",
    candles: 5,
    stars: 399,
    originalStars: 495,
  },
  {
    id: "bundle_10",
    label: "BUNDLE_03",
    candles: 10,
    stars: 699,
    originalStars: 990,
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
  const header = useDecrypt("TAROT_TOKENS // SHOP", isVisible, 800);
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
                playSound("/sounds/start.mp3", 0.5);
                onRecharge(b.id);
              }}
              className="group relative w-full py-4 px-4 font-mono text-xs bg-black border border-cyan-400/30 rounded-md overflow-hidden transition-all duration-300 active:scale-[0.97] hover:border-cyan-400/60 hover:shadow-[0_0_16px_rgba(34,211,238,0.15)]"
            >
              <span className="absolute inset-0 overflow-hidden">
                <span className="absolute top-0 left-[-130%] w-full h-full bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent group-hover:animate-[scan_1s_linear]" />
              </span>
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-300/30 opacity-60 group-hover:opacity-100 transition" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-cyan-300 tracking-[0.3em] font-bold">
                    [{b.label}]
                  </span>
                  <span className="text-[10px] text-slate-500 tracking-wider">
                    {b.candles} TOKEN{b.candles > 1 ? "S" : ""}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
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
                      SALE {discount}%
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <TerminalButton variant="cancel" onClick={onCancel}>
        [ cancel ]
      </TerminalButton>
    </div>
  );
}
