import { useEffect, useRef, useState } from "react";
import WebApp from "@twa-dev/sdk";
import backImg from "../assets/back.webp";
import { useDecrypt } from "../hooks/useDecrypt";
import { GlitchCard } from "../components/core/GlitchCard";
import { GreetingScene } from "../scenes/GreetingScene";
import { Cursor } from "../components/ui/Cursor";
import { WarningScene } from "../scenes/WarningScene";
import { InputScene } from "../scenes/InputScene";
import { LoadingScene } from "../scenes/LoadingScene";
import { RulesScene } from "../scenes/RulesScene";
import { TokensScene } from "../scenes/TokensScene";

type Scene = "greeting" | "warning" | "tokens" | "rules" | "input" | "loading";

// ── КОНСТАНТЫ ────────────────────────────────────────────────────
const TOTAL_CARDS = 77;
const MIN_LOADING_MS = 4000;
const CARD_FLIP_INTERVAL = 1400;
const RECORDING_MAX_MS = 9000;

export function HomeScreen() {
  const [homeText, setHomeText] = useState("");
  const [homePaused, setHomePaused] = useState(false);
  const [pythiaVisible, setPythiaVisible] = useState(false);
  const [subtitleText, setSubtitleText] = useState("");

  const [isReading, setIsReading] = useState(false);
  const [scene, setScene] = useState<Scene>("greeting");
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);

  // Печатный текст
  const [oracleGreeting, setOracleGreeting] = useState("");
  const [greetingDone, setGreetingDone] = useState(false);
  const [oracleWarning, setOracleWarning] = useState("");
  const [warningDone, setWarningDone] = useState(false);

  // Input сцена
  const [inputIntroDone, setInputIntroDone] = useState(false);
  const [inputIntroText, setInputIntroText] = useState("");
  const [inputMode, setInputMode] = useState<"choose" | "voice" | "text">(
    "choose",
  );
  const [textQuestion, setTextQuestion] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Loading стейты (возвращаем)
  const [currentCardId, setCurrentCardId] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("SCANNING_MATRIX");
  const cardFlipRef = useRef<ReturnType<typeof setInterval>>();
  const canProceed = apiDone && minTimeDone;

  const userId = "471019051";
  const neuroTokens = 1;

  // Decrypt
  const statusLine1 = useDecrypt(
    `NODE_ID: ${userId} // AUTH_LEVEL: GUEST`,
    terminalVisible,
    1000,
  );
  const statusLine2 = useDecrypt(
    "STATUS: ENCRYPTED_CONNECTION",
    terminalVisible,
    1000,
  );
  const tokensLabel = useDecrypt(
    `AVAILABLE: ${neuroTokens} TAROT_TOKEN`,
    terminalVisible,
    1000,
  );

  // ── Смена сцены ────────────────────────────────────────────────
  const switchScene = (next: Scene) => {
    setSceneVisible(false);
    setTimeout(() => {
      setScene(next);
      if (next === "input") {
        setInputIntroDone(false);
        setInputIntroText("");
        setInputMode("choose");
        setTextQuestion("");
        setIsRecording(false);
        setRecordingError("");
      }
      setSceneVisible(true);
    }, 350);
  };

  // ── Запуск загрузки (полная логика) ────────────────────────────
  const startLoading = (question: string) => {
    switchScene("loading");
    setApiDone(false);
    setMinTimeDone(false);
    setLoadingStatus("SCANNING_MATRIX");
    setCurrentCardId(Math.floor(Math.random() * TOTAL_CARDS));

    setTimeout(() => setMinTimeDone(true), MIN_LOADING_MS);

    const statuses = [
      "SCANNING_MATRIX",
      "ALIGNING_VECTORS",
      "READING_ENTROPY",
      "CONSULTING_ORACLE",
    ];
    statuses.forEach((s, i) => {
      setTimeout(() => setLoadingStatus(s), i * 1000);
    });

    // Имитация API (заменишь на реальный вызов)
    setTimeout(() => setApiDone(true), 2500 + Math.random() * 3000);
  };

  // ── Тасование карт во время загрузки ───────────────────────────
  useEffect(() => {
    if (scene !== "loading") {
      clearInterval(cardFlipRef.current);
      return;
    }
    cardFlipRef.current = setInterval(() => {
      setCurrentCardId(Math.floor(Math.random() * TOTAL_CARDS));
    }, CARD_FLIP_INTERVAL);
    return () => clearInterval(cardFlipRef.current);
  }, [scene]);

  // ── INIT SESSION ───────────────────────────────────────────────
  const handleInitSession = () => {
    setIsReading(true);
    setScene("greeting");
    setTimeout(() => {
      setTerminalVisible(true);
      setSceneVisible(true);
    }, 1300);
  };

  // Фокус на textarea
  useEffect(() => {
    if (inputMode === "text" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [inputMode]);

  // ── Запись голоса ──────────────────────────────────────────────
  const handleVoice = async () => {
    setRecordingError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstart = () => {
        setIsRecording(true);
        recordingTimerRef.current = setTimeout(
          () => mediaRecorder.stop(),
          RECORDING_MAX_MS,
        );
      };
      mediaRecorder.onstop = () => {
        setIsRecording(false);
        clearTimeout(recordingTimerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        // TODO: обработка аудио
      };

      mediaRecorder.start();
      setInputMode("voice");
    } catch (err: any) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setRecordingError(
          "ДОСТУП К МИКРОФОНУ ЗАПРЕЩЁН. Разрешите доступ в настройках браузера.",
        );
      } else {
        setRecordingError("ОШИБКА ИНИЦИАЛИЗАЦИИ МИКРОФОНА.");
      }
    }
  };

  const handleStopRecording = () => {
    clearTimeout(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
  };

  // ── HOME анимации ──────────────────────────────────────────────
  useEffect(() => {
    const pythiaTimer = setTimeout(() => setPythiaVisible(true), 300);
    const subtitleFull = "[ DIGITAL_TARO_BOT ]";
    let si = 0;
    let subtitleTimeout: ReturnType<typeof setTimeout>;
    const typeSubtitle = () => {
      si++;
      setSubtitleText(subtitleFull.slice(0, si));
      if (si < subtitleFull.length) {
        subtitleTimeout = setTimeout(typeSubtitle, 80);
      } else {
        setTimeout(typeHomeText, 600);
      }
    };
    const subtitleStartTimer = setTimeout(typeSubtitle, 1400);
    const homeFullText = `ORACLE_STATUS: ONLINE\nMATRIX_SYNC: ESTABLISHED\nWAITING_FOR_INPUT...`;
    let hi = 0;
    let homeTimeout: ReturnType<typeof setTimeout>;
    const typeHomeText = () => {
      const currentChar = homeFullText[hi];
      hi++;
      setHomeText(homeFullText.slice(0, hi));
      if (hi > homeFullText.length) {
        setHomePaused(true);
        return;
      }
      if (currentChar === "\n") {
        setHomePaused(true);
        homeTimeout = setTimeout(() => {
          setHomePaused(false);
          typeHomeText();
        }, 500);
        return;
      }
      setHomePaused(false);
      homeTimeout = setTimeout(typeHomeText, 45);
    };
    return () => {
      clearTimeout(pythiaTimer);
      clearTimeout(subtitleStartTimer);
      clearTimeout(subtitleTimeout);
      clearTimeout(homeTimeout);
    };
  }, []);

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-slate-200 flex justify-center overflow-hidden font-mono">
      <div className="w-full max-w-md h-screen relative overflow-hidden border-x border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
        {/* SCANLINES */}
        <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />

        {/* PYTHIA (до INIT) */}
        {!isReading && (
          <div
            className="absolute left-0 w-full flex flex-col items-center px-6 z-20"
            style={{ top: "18vh" }}
          >
            <h1 className="flex mb-2">
              {"PYTHIA".split("").map((letter, i) => (
                <span
                  key={i}
                  className="pythia-letter"
                  style={{
                    fontSize: "4.0rem",
                    fontWeight: 900,
                    letterSpacing: "0.35em",
                    display: "inline-block",
                    opacity: pythiaVisible ? 1 : 0,
                    transform: pythiaVisible
                      ? "translateY(0) scale(1)"
                      : "translateY(-24px) scale(0.4)",
                    transition: `opacity 0.45s ease ${i * 0.09}s, transform 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.09}s`,
                  }}
                >
                  {letter}
                </span>
              ))}
            </h1>
            <div className="h-5 flex items-center mb-4">
              <span
                style={{ fontSize: "16px" }}
                className="text-cyan-400/70 uppercase tracking-widest"
              >
                {subtitleText}
              </span>
              {subtitleText.length < "[ DIGITAL_TARO_BOT ]".length && (
                <span className="inline-block w-[6px] h-[12px] bg-cyan-400/60 ml-[2px] animate-pulse" />
              )}
            </div>
            <div
              style={{ fontSize: "11px", minHeight: "54px" }}
              className="w-full text-cyan-400/80 tracking-[0.15em] leading-relaxed font-mono whitespace-pre-line"
            >
              {homeText}
              {homeText.length > 0 && <Cursor isBlinking={homePaused} />}
            </div>
          </div>
        )}

        {/* КАРТА (стопка + глитч) */}
        <div
          style={{
            position: "absolute",
            top: isReading ? "2vh" : "50vh",
            left: isReading ? "15%" : "50%",
            transform: isReading
              ? "translateX(calc(-50% + 40px))"
              : "translateX(-50%) translateY(-50%)",
            transition: "all 1.1s cubic-bezier(0.2, 0.9, 0.4, 1.1)",
            zIndex: 10,
          }}
        >
          <div className="relative flex items-center gap-4">
            <div className="card-stack">
              {!isReading && (
                <>
                  <img
                    src={backImg}
                    className="card-left rounded-xl border border-cyan-500/30"
                  />
                  <img
                    src={backImg}
                    className="card-right rounded-xl border border-fuchsia-500/30"
                  />
                </>
              )}
              <img
                src={backImg}
                className="card-center rounded-xl border border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]"
              />
            </div>

            {/* Глитч-карта справа — только во время загрузки */}
            {scene === "loading" && (
              <div
                style={{
                  position: "absolute",
                  left: "calc(100% + 16px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "192px",
                  height: "320px",
                }}
              >
                <GlitchCard cardId={currentCardId} />
              </div>
            )}
          </div>
        </div>

        {/* КНОПКА INIT */}
        {!isReading && (
          <div
            className="absolute left-0 w-full px-6 z-20"
            style={{ top: "68vh" }}
          >
            <button
              onClick={handleInitSession}
              className="group relative w-full py-4 font-mono uppercase tracking-[0.35em] text-sm text-cyan-200 bg-black border border-cyan-400/40 rounded-md overflow-hidden shadow-[0_0_12px_rgba(34,211,238,0.15)] transition-all duration-300 active:scale-[0.97]"
            >
              <span className="absolute inset-0 border border-cyan-300/20 rounded-md shadow-[inset_0_0_18px_rgba(34,211,238,0.08)]" />
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute inset-0 overflow-hidden">
                <span className="absolute top-0 left-[-130%] w-full h-full bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent group-hover:animate-[scan_1s_linear]" />
              </span>
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-300/40 opacity-70 group-hover:opacity-100 transition" />
              <span className="relative z-10 text-cyan-100 group-hover:text-cyan-50 transition-colors">
                [ INIT_SESSION ]
              </span>
            </button>
          </div>
        )}

        {/* ТЕРМИНАЛ (после INIT) */}
        {isReading && (
          <div
            className="absolute left-0 w-full h-full overflow-y-auto z-30 px-6 font-mono text-sm"
            style={{ paddingTop: "30vh" }}
          >
            <div
              style={{
                opacity: terminalVisible ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            >
              {/* Хедер */}
              <div className="border border-cyan-500/30 bg-black/70 p-3.5 mb-2 text-cyan-400/90 text-xs tracking-[0.5px]">
                <span>{statusLine1}</span>
                <br />
                <span>
                  {"STATUS: "}
                  <span className="text-emerald-400">
                    {statusLine2.replace("STATUS: ", "")}
                  </span>
                </span>
              </div>

              {/* Токены */}
              <div className="flex items-center justify-between border border-cyan-500/20 bg-black/50 p-3 mb-5">
                <div className="text-xs text-cyan-400/90">{tokensLabel}</div>
                <button
                  onClick={() => switchScene("tokens")}
                  className="text-cyan-400 hover:text-cyan-300 transition underline decoration-dotted underline-offset-4 text-xs"
                >
                  [TAROT_TOKENS]
                </button>
              </div>

              {/* Сцены */}
              <div
                style={{
                  opacity: sceneVisible ? 1 : 0,
                  transform: sceneVisible ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 0.35s ease, transform 0.35s ease",
                }}
              >
                {scene === "greeting" && (
                  <GreetingScene
                    isVisible={sceneVisible}
                    onStart={() => switchScene("warning")}
                    onCancel={() => {
                      try {
                        WebApp.close();
                      } catch (e) {}
                    }}
                    oracleGreeting={oracleGreeting}
                    greetingDone={greetingDone}
                    setOracleGreeting={setOracleGreeting}
                    setGreetingDone={setGreetingDone}
                  />
                )}

                {scene === "warning" && (
                  <WarningScene
                    isVisible={sceneVisible}
                    onConfirm={() => switchScene("input")}
                    onCancel={() => switchScene("greeting")}
                    onShowRules={() => switchScene("rules")}
                    oracleWarning={oracleWarning}
                    warningDone={warningDone}
                    setOracleWarning={setOracleWarning}
                    setWarningDone={setWarningDone}
                  />
                )}

                {scene === "tokens" && (
                  <TokensScene
                    isVisible={sceneVisible}
                    onRecharge={() => {
                      /* recharge */
                    }}
                    onCancel={() => switchScene("greeting")}
                  />
                )}

                {scene === "rules" && (
                  <RulesScene
                    isVisible={sceneVisible}
                    onAcknowledge={() => switchScene("warning")}
                  />
                )}

                {scene === "input" && (
                  <InputScene
                    isVisible={sceneVisible}
                    onAsk={startLoading}
                    inputIntroText={inputIntroText}
                    inputIntroDone={inputIntroDone}
                    setInputIntroText={setInputIntroText}
                    setInputIntroDone={setInputIntroDone}
                    inputMode={inputMode}
                    setInputMode={setInputMode}
                    textQuestion={textQuestion}
                    setTextQuestion={setTextQuestion}
                    isRecording={isRecording}
                    recordingError={recordingError}
                    onVoiceStart={handleVoice}
                    onVoiceStop={handleStopRecording}
                  />
                )}

                {scene === "loading" && (
                  <LoadingScene
                    isVisible={sceneVisible}
                    loadingStatus={loadingStatus}
                    apiDone={apiDone}
                    canProceed={canProceed}
                    onNext={() => {
                      // TODO: переход к результату расклада
                      console.log("next clicked");
                    }}
                    onCancel={() => {
                      clearInterval(cardFlipRef.current);
                      setIsReading(false);
                    }}
                  />
                )}
              </div>
            </div>

            {/* ORACLE IS WATCHING */}
            <div className="py-10 text-center w-full">
              <p className="text-cyan-400/70 text-sm animate-pulse">
                THE ORACLE IS WATCHING...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
