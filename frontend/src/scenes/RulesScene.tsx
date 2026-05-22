import { TerminalButton } from "../components/ui/TerminalButton";
import { useDecrypt } from "../hooks/useDecrypt";

interface RulesSceneProps {
  isVisible: boolean;
  onAcknowledge: () => void;
}

export function RulesScene({ isVisible, onAcknowledge }: RulesSceneProps) {
  const p1 = useDecrypt(
    "Пифия не машина для развлечений. Она считывает твой вектор.",
    isVisible,
    1200,
  );
  const p2 = useDecrypt("Запрещено:", isVisible, 1200);
  const li1 = useDecrypt(
    "Запросы, содержащие насилие, деструктив или угрозы.",
    isVisible,
    1200,
  );
  const li2 = useDecrypt(
    'Намеренный "шум", бессмысленные символы или троллинг алгоритма.',
    isVisible,
    1200,
  );
  const p3 = useDecrypt("Последствия:", isVisible, 1200);
  const p4 = useDecrypt(
    "Нарушение протокола вызовет немедленный сброс соединения. Токен будет уничтожен без возврата. Три критических нарушения приведут к полному отсечению твоего Node_ID от системы.",
    isVisible,
    1200,
  );
  const p5 = useDecrypt("Уважай Оракула.", isVisible, 1200);

  if (!isVisible) return null;

  return (
    <div>
      <div className="text-sm text-rose-400/60 tracking-widest mb-4 uppercase">
        SECURITY_PROTOCOL // RULES
      </div>
      <div className="leading-relaxed text-slate-300 mb-6 border-l-2 border-rose-500/40 pl-4 text-[14px] space-y-3">
        <p>{p1}</p>
        <p className="text-rose-400/80 uppercase tracking-wider text-[12px]">
          {p2}
        </p>
        <ul className="space-y-1 text-[13.5px]">
          <li className="flex gap-2">
            <span className="text-rose-500">▸</span> {li1}
          </li>
          <li className="flex gap-2">
            <span className="text-rose-500">▸</span> {li2}
          </li>
        </ul>
        <p className="text-rose-400/80 uppercase tracking-wider text-[12px]">
          {p3}
        </p>
        <p className="text-[13.5px]">{p4}</p>
        <p className="text-slate-400 italic">{p5}</p>
      </div>
      <div className="flex flex-col gap-3">
        <TerminalButton variant="primary" onClick={onAcknowledge}>
          [ acknowledge ]
        </TerminalButton>
      </div>
    </div>
  );
}
