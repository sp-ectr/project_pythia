const audioCache: Record<string, HTMLAudioElement> = {};

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
