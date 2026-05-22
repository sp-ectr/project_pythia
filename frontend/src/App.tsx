import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { BootScreen } from "./screens/BootScreen";
import { HomeScreen } from "./screens/HomeScreen";

type Screen = "BOOT" | "HOME";

export default function App() {
  const [screen, setScreen] = useState<Screen>("BOOT");

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#000000");
    } catch (e) {}
  }, []);

  if (screen === "BOOT") {
    return <BootScreen onComplete={() => setScreen("HOME")} />;
  }

  return <HomeScreen />;
}
