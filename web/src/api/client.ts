import type {
  CardDTO,
  CardsResponse,
  GradeResult,
  QueueResponse,
  RecallContextResponse,
  SessionLog,
} from "@engram/shared";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError(res.status, "server returned a non-JSON response");
  }
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as Record<string, unknown>)["error"])
        : `request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export const api = {
  getQueue: () => request<QueueResponse>("/api/queue"),
  getCards: () => request<CardsResponse>("/api/cards"),
  getCard: (id: string) => request<CardDTO>(`/api/cards/${encodeURIComponent(id)}`),
  gradeCard: (id: string, result: GradeResult) =>
    request<CardDTO>(`/api/cards/${encodeURIComponent(id)}/grade`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ result }),
    }),
  getRecallContext: () => request<RecallContextResponse>("/api/session/recall-context"),
  postRecall: (text: string) =>
    request<SessionLog>("/api/session/recall", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }),
};
