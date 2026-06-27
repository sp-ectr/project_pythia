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
import {
  appReducer,
  initialState,
  type Scene,
  type CardInterpretation,
} from "../state/appReducer";

const TOTAL_CARDS = 77;
const MIN_LOADING_MS = 4000;
const CARD_FLIP_INTERVAL = 1400;
const RECORDING_MAX_MS = 9000;

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

  const [mutedState, setMutedState] = useState(false);

  const { currentScene: scene, isReading, tokensBalance, inputState, generationState } = state;
  const canProceed = generationState.apiDone && generationState.minTimeoutDone;

  const statusLine1 = useDecrypt(
    `ID_УЗЛА: ${state.nodeId} // ДОСТУП: ГОСТЬ`,
    terminalVisible,
    1000,
  );
  const statusLine2 = useDecrypt(
    "СТАТУС: ЗАШИФРОВАН",
    terminalVisible,
    1000,
  );
  const tokensLabel = useDecrypt(
    `БАЛАНС: ${tokensBalance} ТОКЕН`,
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

    setTimeout(() => dispatch({ type: "SET_MIN_TIMEOUT_REACHED" }), MIN_LOADING_MS);

    const statuses = [
      "СКАНИРОВАНИЕ_МАТРИЦЫ",
      "ВЫРАВНИВАНИЕ_ВЕКТОРОВ",
      "ЧТЕНИЕ_ЭНТРОПИИ",
      "КОНСУЛЬТАЦИЯ_С_ОРАКУЛОМ",
    ];
    statuses.forEach((s, i) => {
      setTimeout(() => dispatch({ type: "SET_LOADING_STATUS", status: s }), i * 1000);
    });

    setTimeout(() => {
      dispatch({ type: "SET_MIN_TIMEOUT_REACHED" });
      dispatch({ type: "SET_API_DATA_LOADED", result: {
        intro: "Душа, ищущая опоры в потоках кода и золота, вы пришли к порогу, где зеркала отражают не то, что вы желаете видеть, а то, что вы боитесь признать.",
        conclusion: "Офер придет не как подарок, а как трофей, добытый в схватке.",
        cards_interpretation: [],
      }});
    }, 2500 + Math.random() * 3000);
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

    if (tokensBalance <= 0) {
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

        setTimeout(() => {
          const mockQuestion = "Какое будущее ждёт мои коммиты?";
          dispatch({ type: "SET_TEXT_QUESTION", text: mockQuestion });
          startLoading(mockQuestion);
        }, 1500);
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
        subtitleTimeout = setTimeout(typeSubtitle, 80);
        timers.push(subtitleTimeout);
      } else {
        const t = setTimeout(typeHomeText, 600);
        timers.push(t);
      }
    };
    const subtitleStartTimer = setTimeout(typeSubtitle, 1400);
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
        }, 500);
        timers.push(homeTimeout);
        return;
      }
      if (currentChar !== " ") {
        playSound("/sounds/blip.mp3", 0.1);
      }
      setHomePaused(false);
      homeTimeout = setTimeout(typeHomeText, 70);
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
                    tokensBalance <= 0
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
                      tokensBalance <= 0
                        ? "text-rose-400 hover:text-rose-300"
                        : "text-cyan-400 hover:text-cyan-300"
                    }`}
                  >
                    [ КУПИТЬ ТОКЕНЫ ]
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
                      if (tokensBalance <= 0) {
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
                      const mockCards: CardInterpretation[] = [
                        {
                          position: 1,
                          position_meaning: "Past",
                          card_id: 13,
                          card_name: "Lorem I",
                          is_reversed: true,
                          text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
                        },
                        {
                          position: 2,
                          position_meaning: "Present",
                          card_id: 50,
                          card_name: "Lorem II",
                          is_reversed: false,
                          text: "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
                        },
                        {
                          position: 3,
                          position_meaning: "Future",
                          card_id: 1,
                          card_name: "Lorem III",
                          is_reversed: true,
                          text: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
                        },
                        {
                          position: 4,
                          position_meaning: "Challenge",
                          card_id: 6,
                          card_name: "Lorem IV",
                          is_reversed: false,
                          text: "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.",
                        },
                        {
                          position: 5,
                          position_meaning: "Guidance",
                          card_id: 9,
                          card_name: "Lorem V",
                          is_reversed: false,
                          text: "Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.",
                        },
                        {
                          position: 6,
                          position_meaning: "Surroundings",
                          card_id: 52,
                          card_name: "Lorem VI",
                          is_reversed: false,
                          text: "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.",
                        },
                        {
                          position: 7,
                          position_meaning: "Action",
                          card_id: 42,
                          card_name: "Lorem VII",
                          is_reversed: false,
                          text: "Ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.",
                        },
                        {
                          position: 8,
                          position_meaning: "Obstacle",
                          card_id: 49,
                          card_name: "Lorem VIII",
                          is_reversed: true,
                          text: "Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti.",
                        },
                        {
                          position: 9,
                          position_meaning: "Strength",
                          card_id: 44,
                          card_name: "Lorem IX",
                          is_reversed: true,
                          text: "Quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.",
                        },
                        {
                          position: 10,
                          position_meaning: "Outcome",
                          card_id: 25,
                          card_name: "Lorem X",
                          is_reversed: false,
                          text: "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.",
                        },
                      ];
                      dispatch({
                        type: "SET_API_DATA_LOADED",
                        result: {
                          intro: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
                          conclusion: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
                          cards_interpretation: mockCards,
                        },
                      });
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
                    onSubmit={(rating, text) => {
                      console.log("Feedback:", { rating, text });
                    }}
                    onSkip={() => {
                      dispatch({ type: "TERMINATE_SESSION" });
                    }}
                    nodeId={state.nodeId}
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
