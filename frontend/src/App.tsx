import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { BootScreen } from "./screens/BootScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { startBgMusic } from "./utils/sound";

type Screen = "TAP" | "BOOT" | "HOME";

export default function App() {
  const [screen, setScreen] = useState<Screen>("TAP");

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#000000");
    } catch (e) {}
  }, []);

  if (screen === "TAP") {
    return (
      <div
        onClick={() => {
          setScreen("BOOT");
          startBgMusic("/sounds/fon.mp3", 0.15);
        }}
        className="min-h-screen bg-black text-cyan-400 flex flex-col items-center justify-center font-mono cursor-pointer select-none"
      >
        <div className="text-4xl font-black tracking-[0.3em] mb-6 animate-pulse">
          PYTHIA
        </div>
        <div className="text-xs text-cyan-400/60 tracking-[0.4em] uppercase animate-pulse">
          [ tap to initialize ]
        </div>
      </div>
    );
  }

  if (screen === "BOOT") {
    return <BootScreen onComplete={() => setScreen("HOME")} />;
  }

  return <HomeScreen />;
}
