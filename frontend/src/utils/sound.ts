const audioCache: Record<string, HTMLAudioElement> = {};
let bgMuted = false;
let bgMusic: HTMLAudioElement | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  return new AudioContext();
}

function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") {
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

export function stopAll() {
  Object.values(audioCache).forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });
}

export function startBgMusic(src: string, volume = 0.15) {
  if (bgMusic) return;
  bgMusic = new Audio(src);
  bgMusic.loop = true;
  bgMusic.volume = bgMuted ? 0 : volume;
  bgMusic.play().catch(() => {});
}

export function toggleMute(volume = 0.15) {
  bgMuted = !bgMuted;
  if (bgMusic) {
    bgMusic.volume = bgMuted ? 0 : volume;
    if (!bgMuted) bgMusic.play().catch(() => {});
  }
  return bgMuted;
}

export function isMuted() {
  return bgMuted;
}
