export interface UserMeResponse {
  nodeId: number;
  username: string;
  tokens: number;
  language_code: string;
  is_admin: boolean;
  is_active: boolean;
  strikes: number;
}

export interface CardInterpretation {
  position: number;
  position_explanation: string;
  card_id: number;
  card_name: string;
  is_reversed: boolean;
  text: string;
}

export interface OracleResponse {
  is_safe: boolean;
  refusal_reason?: string;
  intro?: string;
  conclusion?: string;
  cards_interpretation: CardInterpretation[];
}

export interface AskPythiaResponse {
  reading_id: string | null;
  is_safe: boolean;
  refusal_reason?: string | null;
  interpretation?: OracleResponse | null;
  strikes: number;
  is_active: boolean;
}

const getTelegramInitData = (): string => {
  // @ts-ignore
  const webApp = window.Telegram?.WebApp;
  return webApp?.initData || "";
};

export async function fetchUserInfo(): Promise<UserMeResponse> {
  const initData = getTelegramInitData();

  const response = await fetch("/api/users/me", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-TG-Data": initData,
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("USER_BANNED");
    }
    throw new Error("AUTH_FAILED");
  }

  return response.json();
}

export async function askOracle(
  question?: string,
  voiceBlob?: Blob,
  voiceFilename?: string
): Promise<AskPythiaResponse> {
  const initData = getTelegramInitData();
  const formData = new FormData();

  if (voiceBlob && voiceFilename) {
    formData.append("voice", voiceBlob, voiceFilename);
  } else if (question) {
    formData.append("question", question);
  }

  const response = await fetch("/api/oracle/ask", {
    method: "POST",
    headers: {
      "X-TG-Data": initData,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("NO_TOKENS_OR_BANNED");
    }
    if (response.status === 413) {
      throw new Error("FILE_TOO_LARGE");
    }
    throw new Error("API_ERROR");
  }

  return response.json();
}

export async function sendToChat(readingId: string): Promise<{ status: string; message: string }> {
  const initData = getTelegramInitData();

  const response = await fetch(`/api/oracle/send-to-chat/${readingId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TG-Data": initData,
    },
  });

  if (!response.ok) {
    throw new Error("SEND_TO_CHAT_FAILED");
  }

  return response.json();
}
