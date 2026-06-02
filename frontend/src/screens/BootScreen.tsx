import { useState, useEffect } from "react";
import { Cursor } from "../components/ui/Cursor";

interface BootScreenProps {
  onComplete: () => void;
}

export function BootScreen({ onComplete }: BootScreenProps) {
  const [bootText, setBootText] = useState("");
  const [bootPaused, setBootPaused] = useState(false);

  useEffect(() => {
    const fullText = `> CONNECTING TO NEURAL NETWORK..
> BYPASSING SECURITY PROTOCOLS..
> CALIBRATING ORACLE ENGINE V0.1

> SYSTEM READY.`;

    let index = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      setBootText(fullText.slice(0, index));
      const currentChar = fullText[index];
      index++;

      if (index > fullText.length) {
        setBootPaused(true);
        setTimeout(onComplete, 2000);
        return;
      }

      if (currentChar === "\n") {
        setBootPaused(true); // пауза — мигает
        timeout = setTimeout(() => {
          setBootPaused(false);
          type();
        }, 1500);
        return;
      }

      setBootPaused(false); // печатает — не мигает
      timeout = setTimeout(type, 50);
    };

    type();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-cyan-400 flex items-center justify-center font-mono p-6 overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 blur-3xl rounded-full" />
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:4px_4px]" />
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px]" />
      <div className="relative z-10 w-full max-w-md text-base leading-7 whitespace-pre-line drop-shadow-[0_0_6px_cyan]">
        {bootText}
        <Cursor isBlinking={bootPaused} />
      </div>
    </div>
  );
}
