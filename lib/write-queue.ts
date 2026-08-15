/**
 * Venue wifi drops. Wallet posts carry idempotency keys, so a retry is safe.
 * Slots/chests are not queued — those need the server roll before the reel moves.
 */

const DB_NAME = "larp-writes";
const STORE = "outbox";

export interface QueuedWrite {
  id: string;
  url: string;
  body: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function queueId(url: string, body: unknown): string {
  if (body && typeof body === "object" && "key" in body && typeof (body as { key: unknown }).key === "string") {
    return `${url}:${(body as { key: string }).key}`;
  }
  return `${url}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|offline|load failed/i.test(msg);
}

export async function enqueueWrite(url: string, body: unknown): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      id: queueId(url, body),
      url,
      body: JSON.stringify(body),
      createdAt: Date.now(),
    } satisfies QueuedWrite);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function allWrites(): Promise<QueuedWrite[]> {
  const db = await openDb();
  const rows = await new Promise<QueuedWrite[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedWrite[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

async function dropWrite(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushWriteQueue(): Promise<void> {
  if (typeof indexedDB === "undefined" || (typeof navigator !== "undefined" && !navigator.onLine)) return;
  const rows = await allWrites();
  for (const row of rows) {
    try {
      const res = await fetch(row.url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: row.body,
      });
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        await dropWrite(row.id);
      }
    } catch {
      return;
    }
  }
}

let pumping = false;

export function startQueuePump(): void {
  if (pumping || typeof window === "undefined") return;
  pumping = true;
  const tick = () => {
    void flushWriteQueue();
  };
  window.addEventListener("online", tick);
  setInterval(tick, 8000);
  tick();
}
