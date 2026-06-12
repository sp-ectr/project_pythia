import { useEffect, useRef, useState } from "react";
import WebApp from "@twa-dev/sdk";
import backImg from "../assets/back.webp";
import { useDecrypt } from "../hooks/useDecrypt";
import { GlitchCard } from "../components/core/GlitchCard";
import { playSound } from "../utils/sound";
import { GreetingScene } from "../scenes/GreetingScene";
import { Cursor } from "../components/ui/Cursor";
import { WarningScene } from "../scenes/WarningScene";
import { InputScene } from "../scenes/InputScene";
import { LoadingScene } from "../scenes/LoadingScene";
import { RulesScene } from "../scenes/RulesScene";
import { TokensScene } from "../scenes/TokensScene";
import { ResultScene } from "../scenes/ResultScene";
import { ProtocolScene } from "../scenes/ProtocolScene";
import { FeedbackScene } from "../scenes/FeedbackScene";

type Scene =
  | "greeting"
  | "warning"
  | "tokens"
  | "rules"
  | "input"
  | "loading"
  | "result"
  | "protocol"
  | "feedback";

const TOTAL_CARDS = 77;
const MIN_LOADING_MS = 4000;
const CARD_FLIP_INTERVAL = 1400;
const RECORDING_MAX_MS = 9000;

interface CardInterpretation {
  position: number;
  position_meaning: string;
  card_id: number;
  card_name: string;
  is_reversed: boolean;
  text: string;
}

interface OracleResponse {
  is_safe: boolean;
  intro?: string;
  conclusion?: string;
  card_interpretations: CardInterpretation[];
}

export function HomeScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;
    if (terminalRef.current) terminalRef.current.scrollTop = 0;
    document.querySelectorAll(".overflow-y-auto").forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
    });
  };

  const [homeText, setHomeText] = useState("");
  const [homePaused, setHomePaused] = useState(false);
  const [pythiaVisible, setPythiaVisible] = useState(false);
  const [subtitleText, setSubtitleText] = useState("");

  const [isReading, setIsReading] = useState(false);
  const [scene, setScene] = useState<Scene>("greeting");
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);

  const [oracleGreeting, setOracleGreeting] = useState("");
  const [greetingDone, setGreetingDone] = useState(false);
  const [oracleWarning, setOracleWarning] = useState("");
  const [warningDone, setWarningDone] = useState(false);

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
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [currentCardId, setCurrentCardId] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("SCANNING_MATRIX");
  const cardFlipRef = useRef<ReturnType<typeof setInterval>>(null);
  const canProceed = apiDone && minTimeDone;

  const [readingResult, setReadingResult] = useState<OracleResponse | null>(
    null,
  );

  const userId = "471019051";
  const neuroTokens = 1;

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

  const switchScene = (next: Scene) => {
    scrollToTop();
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

  const startLoading = () => {
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

    setTimeout(() => setApiDone(true), 2500 + Math.random() * 3000);
  };

  useEffect(() => {
    if (scene !== "loading") {
      if (cardFlipRef.current) clearInterval(cardFlipRef.current);
      return;
    }
    cardFlipRef.current = setInterval(() => {
      setCurrentCardId(Math.floor(Math.random() * TOTAL_CARDS));
    }, CARD_FLIP_INTERVAL);
    return () => {
      if (cardFlipRef.current) clearInterval(cardFlipRef.current);
    };
  }, [scene]);

  const handleInitSession = () => {
    scrollToTop();
    setIsReading(true);

    if (neuroTokens <= 0) {
      setScene("tokens");
    } else {
      setScene("greeting");
    }

    setTimeout(() => {
      setTerminalVisible(true);
      setSceneVisible(true);
    }, 1300);
  };

  useEffect(() => {
    if (inputMode === "text" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [inputMode]);

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
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        stream.getTracks().forEach((t) => t.stop());
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
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
  };

  useEffect(() => {
    const pythiaTimer = setTimeout(() => setPythiaVisible(true), 300);
    const subtitleFull = "[ DIGITAL_TARO_BOT ]";
    let si = 0;
    let subtitleTimeout: ReturnType<typeof setTimeout>;
    const typeSubtitle = () => {
      si++;
      setSubtitleText(subtitleFull.slice(0, si));
      if (subtitleFull[si - 1] !== " " && subtitleFull[si - 1] !== "]") {
        playSound("/sounds/typing-click.mp3", 0.7);
      }
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
      if (currentChar !== " ") {
        playSound("/sounds/typing-click.mp3", 0.7);
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

  return (
    <div className="min-h-screen bg-black text-slate-200 flex items-center justify-center overflow-hidden font-mono">
      <div
        ref={containerRef}
        className="flex flex-col relative overflow-hidden border border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] bg-black"
        style={{ width: "390px", height: "844px" }}
      >
        {/* SCANLINES */}
        <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />

        {!isReading && (
          <div className="w-full flex flex-col items-center px-6 mt-10 z-20">
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
        <div className="h-75 w-full"></div>

        {/* карта - лого */}
        {scene !== "result" && (
          <div
            style={{
              position: "absolute",
              top: isReading ? "0%" : "50%",
              left: isReading ? "17%" : "50%",
              transform: isReading
                ? "translateX(calc(-50% + 40px)) scale(0.8)"
                : "translateX(-50%) translateY(-50%) scale(1)",
              transition: "all 1.1s cubic-bezier(0.2, 0.9, 0.4, 1.1)",
              zIndex: 10,
              transformOrigin: isReading ? "10% 10%" : "center",
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
                    left: "calc(100% + 30px)",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "215px",
                    height: "336px",
                  }}
                >
                  <GlitchCard cardId={currentCardId} />
                </div>
              )}
            </div>
          </div>
        )}

        {!isReading && (
          <div className="flex justify-center px-6 mt-24 z-20">
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

        {isReading && (
          <div
            ref={terminalRef}
            className="absolute left-0 w-full h-full z-30 px-6 font-mono text-sm overflow-y-auto"
            style={{ paddingTop: scene === "result" ? "0" : scene === "loading" ? "78%" : "28%" }}
          >
            <div
              style={{
                opacity: terminalVisible ? 1 : 0,
                transition: "opacity 0.3s ease",
                height: "auto",
              }}
              className="flex flex-col w-full"
            >
              {scene !== "result" && scene !== "loading" && (
                <div className="ml-[45%] mr-[-6%] border border-cyan-500/30 bg-black/70 p-3.5 mb-2 text-cyan-400/90 text-xs tracking-[0.5px]">
                  <span>{statusLine1}</span>
                  <br />
                  <span>
                    {"STATUS: "}
                    <span className="text-emerald-400">
                      {statusLine2.replace("STATUS: ", "")}
                    </span>
                  </span>
                </div>
              )}

              {scene !== "result" && scene !== "loading" && (
                <div
                  className={`ml-[45%] mr-[-6%] flex flex-col bg-black/50 p-3 mb-5 transition-colors duration-500 ${
                    neuroTokens <= 0
                      ? "border-rose-500/25 text-rose-400/90"
                      : "border-cyan-500/20 text-cyan-400/90"
                  }`}
                  style={{ borderWidth: "1px", borderStyle: "solid" }}
                >
                  <div className="text-xs mb-2">{tokensLabel}</div>
                  <button
                    onClick={() => switchScene("tokens")}
                    className={`transition-colors duration-300 underline decoration-dotted underline-offset-4 text-xs self-start ${
                      neuroTokens <= 0
                        ? "text-rose-400 hover:text-rose-300"
                        : "text-cyan-400 hover:text-cyan-300"
                    }`}
                  >
                    [TAROT_TOKENS]
                  </button>
                </div>
              )}

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
                    onShowProtocol={() => switchScene("protocol")}
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
                    onRecharge={(bundleId) => {
                      console.log("Purchase bundle:", bundleId);
                    }}
                    onCancel={() => {
                      if (neuroTokens <= 0) {
                        setIsReading(false);
                      } else {
                        switchScene("greeting");
                      }
                    }}
                  />
                )}

                {scene === "rules" && (
                  <RulesScene
                    isVisible={sceneVisible}
                    onAcknowledge={() => switchScene("warning")}
                  />
                )}

                {scene === "protocol" && (
                  <ProtocolScene
                    isVisible={sceneVisible}
                    onBack={() => switchScene("greeting")}
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
                    onComplete={() => {
                      const mockCards: CardInterpretation[] = [
                        {
                          position: 1,
                          position_meaning: "Past",
                          card_id: 13, // Death
                          card_name: "Смерть",
                          is_reversed: true,
                          text: "Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.Ты застрял в коконе прошлого, боясь отпустить старые методы. Перемены стучатся в двери, но ты держишь их на засове, питая застой своей нерешительностью.",
                        },
                        {
                          position: 2,
                          position_meaning: "Present",
                          card_id: 50, // Nine of Pentacles
                          card_name: "Девятка Пентаклей",
                          is_reversed: false,
                          text: "Твоя жажда независимости и комфорта становится клеткой. Ты ищешь внешнего признания, забывая, что истинное мастерство рождается в дисциплине, а не в ожидании плодов.",
                        },
                        {
                          position: 3,
                          position_meaning: "Future",
                          card_id: 1, // Magician
                          card_name: "Маг",
                          is_reversed: true,
                          text: "В основе лежат нереализованные амбиции и попытки срезать путь. Ты пытался играть с судьбой, вместо того чтобы ковать свои инструменты с честностью.",
                        },
                        {
                          position: 4,
                          position_meaning: "Challenge",
                          card_id: 6, // Lovers
                          card_name: "Влюбленные",
                          is_reversed: false,
                          text: "Недавний выбор, сделанный тобой, был окрашен стремлением к гармонии, но, возможно, ты выбрал путь наименьшего сопротивления, а не путь истинного призвания.",
                        },
                        {
                          position: 5,
                          position_meaning: "Guidance",
                          card_id: 9, // Hermit
                          card_name: "Отшельник",
                          is_reversed: false,
                          text: "Ты стремишься к глубокому пониманию своего ремесла. Это благородная цель, требующая уединения и отказа от суеты ради накопления внутренней мудрости.",
                        },
                        {
                          position: 6,
                          position_meaning: "Surroundings",
                          card_id: 52, // Queen of Pentacles
                          card_name: "Королева Пентаклей",
                          is_reversed: false,
                          text: "Земная удача близка. Практические шаги и забота о материальной базе принесут свои плоды, если ты применишь упорство вместо грез.",
                        },
                        {
                          position: 7,
                          position_meaning: "Action",
                          card_id: 42, // Seven of Cups
                          card_name: "Семерка Кубков",
                          is_reversed: false,
                          text: "Твой разум затуманен призраками множества дорог. Ты видишь тени оферов, но не можешь различить, где истина, а где лишь игра твоего воображения.",
                        },
                        {
                          position: 8,
                          position_meaning: "Obstacle",
                          card_id: 49, // Page of Pentacles
                          card_name: "Паж Пентаклей",
                          is_reversed: true,
                          text: "Внешний мир вокруг тебя полон прокрастинации. Потенциальные возможности тратятся впустую, и среда не способствует твоему стремительному росту.",
                        },
                        {
                          position: 9,
                          position_meaning: "Strength",
                          card_id: 44, // Nine of Cups
                          card_name: "Девятка Кубков",
                          is_reversed: true,
                          text: "Ты боишься, что, достигнув желаемого, обнаружишь пустоту. Твои ожидания от карьеры могут оказаться лишь декорациями, скрывающими отсутствие счастья.",
                        },
                        {
                          position: 10,
                          position_meaning: "Outcome",
                          card_id: 25, // Five of Wands
                          card_name: "Пятерка Жезлов",
                          is_reversed: false,
                          text: "Путь к оферу лежит через хаос и борьбу. Тебе придется доказывать свое право на место в строю, сражаясь с конкурентами и собственным беспокойством.",
                        },
                      ];
                      const mockResult: OracleResponse = {
                        is_safe: true,
                        intro:
                          "Душа, ищущая опоры в потоках кода и золота, ты пришла к порогу, где зеркала отражают не то, что ты желаешь видеть, а то, что ты боишься признать.",
                        conclusion:
                          "Офер придет не как подарок, а как трофей, добытый в схватке. Перестань грезить о легком пути — сбрось оковы сомнений, отточи свой разум в тишине и приготовься к битве за свое место под солнцем. Истинное мастерство не просят, его отвоевывают. Истинное мастерство не просят, его отвоевывают.",
                        card_interpretations: mockCards,
                      };
                      setReadingResult(mockResult);
                      switchScene("result");
                    }}
                    onCancel={() => {
                      if (cardFlipRef.current)
                        clearInterval(cardFlipRef.current);
                      setIsReading(false);
                    }}
                  />
                )}

                {scene === "result" && readingResult?.card_interpretations && (
                  <ResultScene
                    isVisible={sceneVisible}
                    cards={readingResult.card_interpretations}
                    intro={readingResult.intro}
                    conclusion={readingResult.conclusion}
                    onScrollToTop={scrollToTop}
                    onShowFeedback={() => switchScene("feedback")}
                    onReset={() => {
                      setIsReading(false);
                      switchScene("greeting");
                    }}
                  />
                )}

                {scene === "feedback" && (
                  <FeedbackScene
                    isVisible={sceneVisible}
                    onSubmit={(rating, text) => {
                      console.log("Feedback:", { rating, text });
                    }}
                    onSkip={() => {
                      setIsReading(false);
                      switchScene("greeting");
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
