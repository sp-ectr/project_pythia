const audioCache: Record<string, HTMLAudioElement> = {};
let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

function unlockAudio() {
  const c = getCtx();
  if (c.state === "suspended") {
    c.resume();
  }
}

if (typeof window !== "undefined") {
  const handler = () => {
    unlockAudio();
    document.removeEventListener("touchstart", handler);
    document.removeEventListener("click", handler);
  };
  document.addEventListener("touchstart", handler, { passive: true });
  document.addEventListener("click", handler, { passive: true });
}

export function playSound(src: string, volume = 0.3) {
  if (!audioCache[src]) {
    const audio = new Audio(src);
    audio.volume = volume;
    audioCache[src] = audio;
  }
  const audio = audioCache[src];
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
