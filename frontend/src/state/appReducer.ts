export type Scene =
  | "greeting"
  | "warning"
  | "tokens"
  | "rules"
  | "input"
  | "loading"
  | "result"
  | "protocol"
  | "feedback";

export type InputMode = "choose" | "voice" | "text";

export interface InputState {
  mode: InputMode;
  textQuestion: string;
  isRecording: boolean;
  recordingError: string;
}

export interface GenerationState {
  loadingStatus: string;
  minTimeoutDone: boolean;
  apiDone: boolean;
  currentCardId: number;
}

export interface CardInterpretation {
  position: number;
  position_meaning: string;
  card_id: number;
  card_name: string;
  is_reversed: boolean;
  text: string;
}

export interface SessionResult {
  intro: string;
  conclusion: string;
  card_interpretations: CardInterpretation[];
}

export interface AudioState {
  muted: boolean;
  bgPlaying: boolean;
}

export interface AppState {
  currentScene: Scene;
  nodeId: string;
  tokensBalance: number;
  audioState: AudioState;
  inputState: InputState;
  generationState: GenerationState;
  sessionResult: SessionResult | null;
  typingDone: boolean;
  isReading: boolean;
}

export type AppAction =
  | { type: "INITIALIZE_USER"; nodeId: string; tokensBalance: number }
  | { type: "TOGGLE_AUDIO_MUTE" }
  | { type: "TRANSITION_TO_SCENE"; scene: Scene }
  | { type: "CHANGE_INPUT_METHOD"; mode: InputMode }
  | { type: "START_MIC_RECORDING" }
  | { type: "STOP_MIC_RECORDING" }
  | { type: "SET_MIC_ERROR"; error: string }
  | { type: "TRIGGER_MATRIX_READING" }
  | { type: "SET_MIN_TIMEOUT_REACHED" }
  | { type: "SET_API_DATA_LOADED"; result: SessionResult }
  | { type: "SET_TYPING_STATUS"; done: boolean }
  | { type: "SET_TEXT_QUESTION"; text: string }
  | { type: "SET_CURRENT_CARD_ID"; cardId: number }
  | { type: "SET_LOADING_STATUS"; status: string }
  | { type: "REFRESH_TOKENS_BALANCE"; balance: number }
  | { type: "START_SESSION" }
  | { type: "TERMINATE_SESSION" };

const TOTAL_CARDS = 77;

export const initialState: AppState = {
  currentScene: "greeting",
  nodeId: "471019051",
  tokensBalance: 1,
  audioState: { muted: false, bgPlaying: false },
  inputState: {
    mode: "choose",
    textQuestion: "",
    isRecording: false,
    recordingError: "",
  },
  generationState: {
    loadingStatus: "СКАНИРОВАНИЕ_МАТРИЦЫ",
    minTimeoutDone: false,
    apiDone: false,
    currentCardId: Math.floor(Math.random() * TOTAL_CARDS),
  },
  sessionResult: null,
  typingDone: false,
  isReading: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "INITIALIZE_USER":
      return {
        ...state,
        nodeId: action.nodeId,
        tokensBalance: action.tokensBalance,
      };

    case "TOGGLE_AUDIO_MUTE":
      return {
        ...state,
        audioState: {
          ...state.audioState,
          muted: !state.audioState.muted,
        },
      };

    case "TRANSITION_TO_SCENE":
      return {
        ...state,
        currentScene: action.scene,
        typingDone: false,
      };

    case "CHANGE_INPUT_METHOD":
      return {
        ...state,
        inputState: {
          ...state.inputState,
          mode: action.mode,
          textQuestion: "",
          isRecording: false,
          recordingError: "",
        },
      };

    case "START_MIC_RECORDING":
      return {
        ...state,
        inputState: {
          ...state.inputState,
          isRecording: true,
          recordingError: "",
        },
      };

    case "STOP_MIC_RECORDING":
      return {
        ...state,
        inputState: {
          ...state.inputState,
          isRecording: false,
        },
      };

    case "SET_MIC_ERROR":
      return {
        ...state,
        inputState: {
          ...state.inputState,
          isRecording: false,
          recordingError: action.error,
        },
      };

    case "SET_TEXT_QUESTION":
      return {
        ...state,
        inputState: {
          ...state.inputState,
          textQuestion: action.text,
        },
      };

    case "TRIGGER_MATRIX_READING":
      return {
        ...state,
        tokensBalance: state.tokensBalance - 1,
        isReading: true,
        generationState: {
          ...state.generationState,
          loadingStatus: "СКАНИРОВАНИЕ_МАТРИЦЫ",
          minTimeoutDone: false,
          apiDone: false,
          currentCardId: Math.floor(Math.random() * TOTAL_CARDS),
        },
      };

    case "SET_MIN_TIMEOUT_REACHED":
      return {
        ...state,
        generationState: {
          ...state.generationState,
          minTimeoutDone: true,
        },
      };

    case "SET_API_DATA_LOADED":
      return {
        ...state,
        generationState: {
          ...state.generationState,
          apiDone: true,
        },
        sessionResult: action.result,
      };

    case "SET_TYPING_STATUS":
      return {
        ...state,
        typingDone: action.done,
      };

    case "SET_CURRENT_CARD_ID":
      return {
        ...state,
        generationState: {
          ...state.generationState,
          currentCardId: action.cardId,
        },
      };

    case "SET_LOADING_STATUS":
      return {
        ...state,
        generationState: {
          ...state.generationState,
          loadingStatus: action.status,
        },
      };

    case "REFRESH_TOKENS_BALANCE":
      return {
        ...state,
        tokensBalance: action.balance,
      };

    case "START_SESSION":
      return {
        ...state,
        isReading: true,
      };

    case "TERMINATE_SESSION":
      return {
        ...initialState,
        nodeId: state.nodeId,
        tokensBalance: state.tokensBalance,
        audioState: state.audioState,
      };

    default:
      return state;
  }
}
