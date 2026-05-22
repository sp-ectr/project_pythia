import { TerminalButton } from "../components/ui/TerminalButton";
import { useDecrypt } from "../hooks/useDecrypt";

interface TokensSceneProps {
  isVisible: boolean;
  onRecharge: () => void;
  onCancel: () => void;
}

export function TokensScene({
  isVisible,
  onRecharge,
  onCancel,
}: TokensSceneProps) {
  const text1 = useDecrypt(
    "Tarot Token — это единица доступа к Оракулу.",
    isVisible,
    1000,
  );
  const text2 = useDecrypt(
    "Каждый расклад Кельтского Креста стоит",
    isVisible,
    1000,
  );
  const token = useDecrypt("1 токен", isVisible, 1000);
  const text4 = useDecrypt(
    "Токены не сгорают, но и не возвращаются за прерванные сессии.",
    isVisible,
    1000,
  );
  const text5 = useDecrypt(
    "Пополни баланс через RECHARGE чтобы продолжить работу с Пифией.",
    isVisible,
    1000,
  );

  if (!isVisible) return null;

  return (
    <div>
      <div className="text-sm text-cyan-400/60 tracking-widest mb-4 uppercase">
        TAROT_TOKENS // INFO
      </div>
      <div className="leading-relaxed text-slate-300 mb-6 border-l-2 border-cyan-400/40 pl-4 text-[14.5px]">
        {text1}
        <br />
        <br />
        {text2} <span className="text-cyan-400">{token}</span>.
        <br />
        <br />
        {text4}
        <br />
        <br />
        {text5}
      </div>
      <div className="flex flex-col gap-3">
        <TerminalButton variant="primary" onClick={onRecharge}>
          [ recharge ]
        </TerminalButton>
        <TerminalButton variant="cancel" onClick={onCancel}>
          [ cancel ]
        </TerminalButton>
      </div>
    </div>
  );
}
