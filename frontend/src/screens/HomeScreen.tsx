import React, { useEffect, useRef, useState, useReducer } from "react";
import WebApp from "@twa-dev/sdk";
import backImg from "../assets/back.webp";
import { useDecrypt } from "../hooks/useDecrypt";
import { GlitchCard } from "../components/core/GlitchCard";
import { playSound, stopAll, toggleMute } from "../utils/sound";
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
import { askOracle, fetchUserInfo, transcribe, createInvoice, type UserMeResponse } from "../services/oracleApi";
import { HistoryScene } from "../scenes/HistoryScene";
import {
  appReducer,
  initialState,
  type Scene,
} from "../state/appReducer";

const TOTAL_CARDS = 77;
const MIN_LOADING_MS = 4000;
const CARD_FLIP_INTERVAL = 1400;
const RECORDING_MAX_MS = 15000;

export function HomeScreen() {
  const [state, dispatch] = useReducer(appReducer, initialState);
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

  const highlightStatus = (text: string) => {
    const keywords = ["АКТИВЕН", "УСТАНОВЛЕНА"];
    let result: (string | React.ReactNode)[] = [text];
    for (const kw of keywords) {
      const parts: (string | React.ReactNode)[] = [];
      for (const part of result) {
        if (typeof part !== "string") { parts.push(part); continue; }
        const segments = part.split(kw);
        segments.forEach((seg, i) => {
          parts.push(seg);
          if (i < segments.length - 1) {
            parts.push(<span key={kw + i} className="text-green-400">{kw}</span>);
          }
        });
      }
      result = parts;
    }
    return result;
  };
  const [homePaused, setHomePaused] = useState(false);
  const [pythiaVisible, setPythiaVisible] = useState(false);
  const [subtitleText, setSubtitleText] = useState("");

  const [terminalVisible, setTerminalVisible] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);

  const [oracleGreeting, setOracleGreeting] = useState("");
  const [greetingDone, setGreetingDone] = useState(false);
  const [oracleWarning, setOracleWarning] = useState("");
  const [warningDone, setWarningDone] = useState(false);

  const [inputIntroDone, setInputIntroDone] = useState(false);
  const [inputIntroText, setInputIntroText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const typingActiveRef = useRef(true);

  const cardFlipRef = useRef<ReturnType<typeof setInterval>>(null);
  const loadingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [mutedState, setMutedState] = useState(false);

  const [user, setUser] = useState<UserMeResponse>({
    nodeId: 0,
    username: "",
    tokens: 1,
    language_code: "ru",
    is_admin: false,
    is_active: true,
    strikes: 0,
  });
  const [banned, setBanned] = useState(false);
  const [offline, setOffline] = useState(false);
  const [oracleError, setOracleError] = useState<string | null>(null);

  const { currentScene: scene, isReading, tokensBalance, inputState, generationState } = state;
  const canProceed = generationState.apiDone && generationState.minTimeoutDone;

  useEffect(() => {
    fetchUserInfo().then((data) => {
      setUser(data);
      dispatch({ type: "INITIALIZE_USER", nodeId: String(data.nodeId), tokensBalance: data.tokens });
    }).catch((err) => {
      console.error("fetchUserInfo error:", err);
      if (err.message === "USER_BANNED") {
        setBanned(true);
      } else {
        setOffline(true);
      }
    });
  }, []);

  const refreshUser = () => {
    fetchUserInfo().then((data) => {
      setUser(data);
      dispatch({ type: "REFRESH_TOKENS_BALANCE", balance: data.tokens });
    }).catch(() => {});
  };

  const authLevel = user.is_admin ? "ADMIN" : "GUEST";
  const tokensText = user.is_admin ? "∞" : `${user.tokens}`;

  const statusLine1 = useDecrypt(
    `ID_УЗЛА: ${user.nodeId} // ДОСТУП: ${authLevel}`,
    terminalVisible,
    1000,
  );
  const statusLine2 = useDecrypt(
    "СТАТУС: ЗАШИФРОВАН",
    terminalVisible,
    1000,
  );
  const tokensLabel = useDecrypt(
    `БАЛАНС: ${tokensText} ТОКЕН`,
    terminalVisible,
    1000,
  );

  const switchScene = (next: Scene) => {
    scrollToTop();
    setSceneVisible(false);
    setTimeout(() => {
      dispatch({ type: "TRANSITION_TO_SCENE", scene: next });
      if (next === "input") {
        setInputIntroDone(false);
        setInputIntroText("");
        dispatch({ type: "CHANGE_INPUT_METHOD", mode: "choose" });
      }
      setSceneVisible(true);
    }, 350);
  };

  const startLoading = (question: string) => {
    dispatch({ type: "SET_TEXT_QUESTION", text: question });
    switchScene("loading");
    dispatch({ type: "TRIGGER_MATRIX_READING" });

    loadingTimersRef.current.forEach(clearTimeout);
    loadingTimersRef.current = [];

    const t1 = setTimeout(() => dispatch({ type: "SET_MIN_TIMEOUT_REACHED" }), MIN_LOADING_MS);
    loadingTimersRef.current.push(t1);

    const statuses = [
      "СКАНИРОВАНИЕ_МАТРИЦЫ",
      "ВЫРАВНИВАНИЕ_ВЕКТОРОВ",
      "ЧТЕНИЕ_ЭНТРОПИИ",
      "КОНСУЛЬТАЦИЯ_С_ОРАКУЛОМ",
    ];
    statuses.forEach((s, i) => {
      const t = setTimeout(() => dispatch({ type: "SET_LOADING_STATUS", status: s }), i * 1000);
      loadingTimersRef.current.push(t);
    });

    askOracle(question).then((response) => {
      refreshUser();
      if (response.is_safe && response.interpretation) {
        dispatch({ type: "SET_API_DATA_LOADED", result: {
          reading_id: response.reading_id,
          intro: response.interpretation.intro || "",
          conclusion: response.interpretation.conclusion || "",
          cards_interpretation: response.interpretation.cards_interpretation || [],
          refusalReason: null,
          strikes: response.strikes,
          is_active: response.is_active,
        }});
      } else if (!response.is_safe) {
        setOracleError(response.refusal_reason || "Запрос отклонён матрицей.");
      }
    }).catch((err) => {
      console.error("Oracle API error:", err);
      loadingTimersRef.current.forEach(clearTimeout);
      loadingTimersRef.current = [];
      if (cardFlipRef.current) clearInterval(cardFlipRef.current);
      setOracleError("Ошибка связи с Оракулом. Попробуйте отправить вопрос позже.");
    });
  };

  useEffect(() => {
    if (scene !== "loading") {
      if (cardFlipRef.current) clearInterval(cardFlipRef.current);
      return;
    }
    cardFlipRef.current = setInterval(() => {
      dispatch({ type: "SET_CURRENT_CARD_ID", cardId: Math.floor(Math.random() * TOTAL_CARDS) });
      playSound("/sounds/cardload.mp3", 0.8);
    }, CARD_FLIP_INTERVAL);
    return () => {
      if (cardFlipRef.current) clearInterval(cardFlipRef.current);
    };
  }, [scene]);

  const handleInitSession = () => {
    typingActiveRef.current = false;
    typingTimersRef.current.forEach(clearTimeout);
    typingTimersRef.current = [];
    stopAll();
    playSound("/sounds/start.mp3", 0.5);
    scrollToTop();
    dispatch({ type: "START_SESSION" });
    setTerminalVisible(true);
    setSceneVisible(true);

    if (!user.is_admin && tokensBalance <= 0) {
      dispatch({ type: "TRANSITION_TO_SCENE", scene: "tokens" });
    } else {
      dispatch({ type: "TRANSITION_TO_SCENE", scene: "greeting" });
    }
  };

  useEffect(() => {
    if (inputState.mode === "text" && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [inputState.mode]);

  useEffect(() => {
    if (!isReading) {
      typingActiveRef.current = true;
      typingTimersRef.current = [];
    }
  }, [isReading]);

  const transcribeVoice = async (voiceBlob: Blob) => {
    dispatch({ type: "SET_TEXT_QUESTION", text: "▸ Распознавание речи..." });
    dispatch({ type: "CHANGE_INPUT_METHOD", mode: "text" });
    try {
      const response = await transcribe(voiceBlob, "voice.ogg");
      if (response.question) {
        dispatch({ type: "SET_TEXT_QUESTION", text: response.question });
      }
    } catch {
      dispatch({ type: "SET_TEXT_QUESTION", text: "" });
      dispatch({ type: "CHANGE_INPUT_METHOD", mode: "choose" });
      setOracleError("Ошибка распознавания голоса. Попробуйте записать снова.");
    }
  };

  const handleVoice = async () => {
    dispatch({ type: "SET_MIC_ERROR", error: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstart = () => {
        dispatch({ type: "START_MIC_RECORDING" });
        recordingTimerRef.current = setTimeout(
          () => mediaRecorder.stop(),
          RECORDING_MAX_MS,
        );
      };
      mediaRecorder.onstop = () => {
        dispatch({ type: "STOP_MIC_RECORDING" });
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg" });
        audioChunksRef.current = [];
        if (audioBlob.size > 0) {
          transcribeVoice(audioBlob);
        }
      };

      mediaRecorder.start();
      dispatch({ type: "CHANGE_INPUT_METHOD", mode: "voice" });
    } catch (err: any) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        dispatch({ type: "SET_MIC_ERROR", error: "ДОСТУП К МИКРОФОНУ ЗАПРЕЩЁН. Разрешите доступ в настройках браузера." });
      } else {
        dispatch({ type: "SET_MIC_ERROR", error: "ОШИБКА ИНИЦИАЛИЗАЦИИ МИКРОФОНА." });
      }
    }
  };

  const handleStopRecording = () => {
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const typingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = typingTimersRef.current;
    const pythiaTimer = setTimeout(() => setPythiaVisible(true), 300);
    timers.push(pythiaTimer);
    const subtitleFull = "[ ЦИФРОВОЙ_ТАРО_БОТ ]";
    let si = 0;
    let subtitleTimeout: ReturnType<typeof setTimeout>;
    const typeSubtitle = () => {
      if (!typingActiveRef.current) return;
      si++;
      setSubtitleText(subtitleFull.slice(0, si));
      if (subtitleFull[si - 1] !== " " && subtitleFull[si - 1] !== "]") {
        playSound("/sounds/blip.mp3", 0.1);
      }
      if (si < subtitleFull.length) {
        subtitleTimeout = setTimeout(typeSubtitle, 50);
        timers.push(subtitleTimeout);
      } else {
        const t = setTimeout(typeHomeText, 350);
        timers.push(t);
      }
    };
    const subtitleStartTimer = setTimeout(typeSubtitle, 800);
    timers.push(subtitleStartTimer);
    const homeFullText = `СОСТОЯНИЕ_ОРАКУЛА: АКТИВЕН\nСИНХРОНИЗАЦИЯ_МАТРИЦЫ: УСТАНОВЛЕНА\nОЖИДАНИЕ_ВВОДА...`;
    let hi = 0;
    let homeTimeout: ReturnType<typeof setTimeout>;
    const typeHomeText = () => {
      if (!typingActiveRef.current) return;
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
        }, 300);
        timers.push(homeTimeout);
        return;
      }
      if (currentChar !== " ") {
        playSound("/sounds/blip.mp3", 0.1);
      }
      setHomePaused(false);
      homeTimeout = setTimeout(typeHomeText, 45);
      timers.push(homeTimeout);
    };
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-slate-200 flex items-center justify-center overflow-hidden font-mono">
      <div
        ref={containerRef}
        className="flex flex-col relative overflow-hidden border border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] bg-black"
        style={{ width: "390px", height: "844px" }}
      >
        {oracleError && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/95 px-8">
            <div className="text-center">
              <div className="text-sm text-amber-400/80 tracking-widest uppercase mb-4 animate-pulse">
                ▸ ОРАКУЛ НЕ ОТВЕЧАЕТ
              </div>
              <div className="border border-amber-500/30 bg-amber-950/20 p-5 rounded-md mb-6">
                <p className="text-amber-300/80 text-[13px] font-mono leading-relaxed tracking-wide">
                  {oracleError}
                </p>
              </div>
              <button
                onClick={() => {
                  playSound("/sounds/start.mp3", 0.5);
                  setOracleError(null);
                  dispatch({ type: "TERMINATE_SESSION" });
                }}
                className="w-full py-3 font-mono text-xs uppercase tracking-[0.2em] border border-cyan-500/30 text-cyan-400 bg-black rounded-md hover:border-cyan-400 transition"
              >
                [ ПОПРОБОВАТЬ СНОВА ]
              </button>
            </div>
          </div>
        )}
        {banned && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/95 px-8">
            <div className="text-center">
              <div className="text-sm text-rose-400/80 tracking-widest uppercase mb-4 animate-pulse">
                ▸ SECURITY PROTOCOL: NODE DEACTIVATED
              </div>
              <div className="border border-rose-500/30 bg-rose-950/20 p-5 rounded-md mb-4">
                <p className="text-rose-300/80 text-[13px] font-mono leading-relaxed tracking-wide">
                  ▸ REASON: TOO MANY CRITICAL STRIKES
                </p>
                <p className="text-rose-300/80 text-[13px] font-mono leading-relaxed tracking-wide mt-2">
                  ▸ ACCESS TO ORACLE: PERMANENTLY DENIED
                </p>
              </div>
            </div>
          </div>
        )}
        {offline && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/95 px-8">
            <div className="text-center">
              <div className="text-sm text-rose-500/80 tracking-widest uppercase mb-4 animate-pulse">
                ▸ СВЯЗЬ С МАТРИЦЕЙ ПОТЕРЯНА
              </div>
              <div className="border border-rose-500/30 bg-rose-950/20 p-5 rounded-md mb-6">
                <p className="text-rose-300/80 text-[13px] font-mono leading-relaxed tracking-wide">
                  ▸ КОД_ОШИБКИ: CONNECTION_REFUSED
                </p>
                <p className="text-rose-300/80 text-[13px] font-mono leading-relaxed tracking-wide mt-2">
                  ▸ Оракул временно недоступен. Проверьте соединение с сетью.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 font-mono text-xs uppercase tracking-[0.2em] border border-cyan-500/30 text-cyan-400 bg-black rounded-md hover:border-cyan-400 transition"
              >
                [ ПЕРЕПОДКЛЮЧЕНИЕ ]
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            const nowMuted = toggleMute(0.1);
            setMutedState(nowMuted);
          }}
          className="absolute bottom-3 right-3 z-[60] flex flex-col items-center gap-1"
        >
          <span className="w-9 h-9 flex items-center justify-center rounded-full border border-cyan-500/30 bg-black/80 text-cyan-400 text-sm font-mono hover:border-cyan-400/60 transition-colors">
            {mutedState ? "🔇" : "🔊"}
          </span>
          <span className="text-[8px] text-cyan-400/40 font-mono tracking-wider">
            {mutedState ? "// OFF" : "// AMBIENT"}
          </span>
        </button>
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
              {highlightStatus(homeText)}
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
                  <GlitchCard cardId={generationState.currentCardId} />
                </div>
              )}
            </div>
          </div>
        )}

        {!isReading && (
          <div className="flex flex-col items-center px-6 mt-24 z-20">
            <div className="text-cyan-400/40 text-lg mb-2 animate-bounce">▲</div>
            <button
              onClick={handleInitSession}
              className="group relative w-full py-4 font-mono uppercase tracking-[0.35em] text-sm text-cyan-200 bg-black border border-cyan-400/60 rounded-md overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.3),0_0_40px_rgba(34,211,238,0.15)] transition-all duration-300 active:scale-[0.97] animate-pulse"
            >
              <span className="absolute inset-0 border border-cyan-300/30 rounded-md shadow-[inset_0_0_20px_rgba(34,211,238,0.12)]" />
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute inset-0 overflow-hidden">
                <span className="absolute top-0 left-[-130%] w-full h-full bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent group-hover:animate-[scan_1s_linear]" />
              </span>
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-300/50 opacity-70 group-hover:opacity-100 transition" />
              <span className="relative z-10 text-cyan-100 group-hover:text-cyan-50 transition-colors drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                [ ЗАПУСК СЕАНСА ]
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
                    {"СТАТУС: "}
                    <span className="text-emerald-400">
                      {statusLine2.replace("СТАТУС: ", "")}
                    </span>
                  </span>
                </div>
              )}

              {scene !== "result" && scene !== "loading" && (
                <div
                  className={`ml-[45%] mr-[-6%] flex flex-col bg-black/50 p-3 mb-5 transition-colors duration-500 ${
                    !user.is_admin && tokensBalance <= 0
                      ? "border-rose-500/25 text-rose-400/90"
                      : "border-cyan-500/20 text-cyan-400/90"
                  }`}
                  style={{ borderWidth: "1px", borderStyle: "solid" }}
                >
                  <div className="text-xs mb-2">{tokensLabel}</div>
                  <button
                    onClick={() => {
                      playSound("/sounds/start.mp3", 0.5);
                      switchScene("tokens");
                    }}
                    className={`transition-colors duration-300 underline decoration-dotted underline-offset-4 text-xs self-start ${
                      !user.is_admin && tokensBalance <= 0
                        ? "text-rose-400 hover:text-rose-300"
                        : "text-cyan-400 hover:text-cyan-300"
                    }`}
                  >
                    [ КУПИТЬ ТОКЕНЫ ]
                  </button>
                </div>
              )}

              {scene !== "result" && scene !== "loading" && (
                <div className="ml-[45%] mr-[-6%] mb-5">
                  <button
                    onClick={() => {
                      playSound("/sounds/start.mp3", 0.5);
                      switchScene("history");
                    }}
                    className="w-full py-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/80 bg-black border border-cyan-500/30 rounded-sm hover:border-cyan-400/60 hover:text-cyan-200 hover:shadow-[0_0_12px_rgba(34,211,238,0.15)] transition-all duration-300 active:scale-[0.97]"
                  >
                    // ИСТОРИЯ РАСКЛАДОВ
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
                      playSound("/sounds/start.mp3", 0.5);
                      createInvoice(bundleId)
                        .then((res) => {
                          // @ts-ignore
                          const webApp = window.Telegram?.WebApp;
                          if (!webApp || !webApp.openInvoice) {
                            dispatch({ type: "SET_MIC_ERROR", error: "ОШИБКА: API ТЕЛЕГРАМА НЕДОСТУПНО" });
                            return;
                          }
                          webApp.openInvoice(res.invoice_link, (status: string) => {
                            if (status === "paid") {
                              playSound("/sounds/start.mp3", 0.5);
                              refreshUser();
                              switchScene("greeting");
                            }
                          });
                        })
                        .catch((err) => {
                          console.error("Failed to create invoice:", err);
                          setOracleError("Не удалось создать invoice. Попробуйте позже.");
                        });
                    }}
                    onCancel={() => {
                      if (!user.is_admin && tokensBalance <= 0) {
                        dispatch({ type: "TERMINATE_SESSION" });
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
                    inputMode={inputState.mode}
                    setInputMode={(mode) => dispatch({ type: "CHANGE_INPUT_METHOD", mode })}
                    textQuestion={inputState.textQuestion}
                    setTextQuestion={(text) => dispatch({ type: "SET_TEXT_QUESTION", text })}
                    isRecording={inputState.isRecording}
                    recordingError={inputState.recordingError}
                    onVoiceStart={handleVoice}
                    onVoiceStop={handleStopRecording}
                  />
                )}

                {scene === "loading" && (
                  <LoadingScene
                    isVisible={sceneVisible}
                    loadingStatus={generationState.loadingStatus}
                    apiDone={generationState.apiDone}
                    canProceed={canProceed}
                    onComplete={() => {
                      switchScene("result");
                    }}
                    onCancel={() => {
                      if (cardFlipRef.current)
                        clearInterval(cardFlipRef.current);
                      dispatch({ type: "TERMINATE_SESSION" });
                    }}
                  />
                )}

                {scene === "result" && state.sessionResult?.cards_interpretation && (
                  <ResultScene
                    isVisible={sceneVisible}
                    cards={state.sessionResult.cards_interpretation}
                    intro={state.sessionResult.intro}
                    conclusion={state.sessionResult.conclusion}
                    refusalReason={state.sessionResult.refusalReason}
                    strikes={state.sessionResult.strikes}
                    onScrollToTop={scrollToTop}
                    onShowFeedback={() => switchScene("feedback")}
                    onReset={() => {
                      dispatch({ type: "TERMINATE_SESSION" });
                      switchScene("greeting");
                    }}
                  />
                )}

                {scene === "feedback" && (
                  <FeedbackScene
                    isVisible={sceneVisible}
                    readingId={state.sessionResult?.reading_id || null}
                    onSubmit={(rating, text) => {
                      console.log("Feedback:", { rating, text });
                    }}
                    onSkip={() => {
                      dispatch({ type: "TERMINATE_SESSION" });
                    }}
                    nodeId={state.nodeId}
                  />
                )}

                {scene === "history" && (
                  <HistoryScene
                    isVisible={sceneVisible}
                    onSelectReading={(reading) => {
                      const interp = reading.interpretation;
                      if (interp) {
                        scrollToTop();
                        setSceneVisible(false);
                        setTimeout(() => {
                          dispatch({ 
                            type: "LOAD_HISTORY_READING", 
                            result: {
                              reading_id: reading.reading_id,
                              intro: interp.intro || "",
                              conclusion: interp.conclusion || "",
                              cards_interpretation: interp.cards_interpretation || [],
                              refusalReason: interp.refusal_reason || null,
                              strikes: reading.strikes,
                              is_active: reading.is_active,
                            }
                          });
                          setSceneVisible(true);
                        }, 350);
                      }
                    }}
                    onBack={() => switchScene("greeting")}
                  />
                )}
              </div>
            </div>

            {/* ORACLE IS WATCHING */}
            <div className="py-10 text-center w-full">
              <p className="text-cyan-400/70 text-sm animate-pulse">
                ОРАКУЛ НАБЛЮДАЕТ...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
