import { enqueueWrite, isNetworkError } from "@/lib/write-queue";
import type { FlavorVerdict, VerdictRequest } from "@/lib/flavor-types";
import type { SessionSnapshot } from "@/lib/session-types";
import type {
  WalletBattleResult,
  WalletChestResult,
  WalletEquipResult,
  WalletSpinResult,
  WalletTriviaResult,
} from "@/lib/wallet-types";

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error || `request failed (${res.status})`);
  }
  return body;
}

async function postWallet<T>(url: string, body: unknown): Promise<T> {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return readJson<T>(res);
  } catch (err) {
    if (typeof window !== "undefined" && isNetworkError(err)) {
      await enqueueWrite(url, body);
      throw new Error("OFFLINE — QUEUED");
    }
    throw err;
  }
}

export async function fetchMe(): Promise<SessionSnapshot> {
  const res = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
  return readJson<SessionSnapshot>(res);
}

export async function postClaim(battlerId: string): Promise<SessionSnapshot> {
  const res = await fetch("/api/claim", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ battlerId }),
  });
  return readJson<SessionSnapshot>(res);
}

export async function postGuest(name: string): Promise<SessionSnapshot> {
  const res = await fetch("/api/guest", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return readJson<SessionSnapshot>(res);
}

export async function postRelease(): Promise<SessionSnapshot> {
  const res = await fetch("/api/claim", {
    method: "DELETE",
    credentials: "same-origin",
  });
  return readJson<SessionSnapshot>(res);
}

export async function postBattleCredit(input: {
  challengerId: string;
  guessId: string;
  key: string;
}): Promise<WalletBattleResult> {
  return postWallet<WalletBattleResult>("/api/battle", input);
}

export async function postTriviaCredit(input: {
  questionId: string;
  answerIndex: number;
  key: string;
}): Promise<WalletTriviaResult> {
  return postWallet<WalletTriviaResult>("/api/trivia", input);
}

export async function postSpin(input: { bet: number; key: string }): Promise<WalletSpinResult> {
  const res = await fetch("/api/slots", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<WalletSpinResult>(res);
}

export async function postChest(input: { key: string }): Promise<WalletChestResult> {
  const res = await fetch("/api/chest", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<WalletChestResult>(res);
}

export async function postEquip(uid: string, equipped: boolean): Promise<WalletEquipResult> {
  return postWallet<WalletEquipResult>("/api/equip", { uid, equipped });
}

export async function postVerdict(input: VerdictRequest): Promise<FlavorVerdict> {
  const res = await fetch("/api/verdict", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<FlavorVerdict>(res);
}

export async function postMagicLink(email: string): Promise<{ ok: boolean; local?: boolean }> {
  const res = await fetch("/api/auth/magic", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return readJson(res);
}
