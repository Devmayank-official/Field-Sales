import { db } from "./db/dexieDb";
import type { Client, Fridge, Visit, Reminder } from "@/lib/schema";
import { Capacitor } from "@capacitor/core";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";
const LAST_SYNC_KEY = "field_sales_last_sync_at";

function isNetworkError(e: unknown): boolean {
  const msg = String(e).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("net::err") ||
    msg.includes("load failed") ||
    msg.includes("econnrefused") ||
    msg.includes("connection refused") ||
    msg.includes("fetch") && msg.includes("error")
  );
}

export type SyncResult = {
  pushed: number;
  pulled: number;
  error?: string;
};

function getLastSyncAt(): number {
  const val = localStorage.getItem(LAST_SYNC_KEY);
  return val ? Number(val) : 0;
}

function setLastSyncAt(ts: number) {
  localStorage.setItem(LAST_SYNC_KEY, String(ts));
}

function stripDirty<T extends { _dirty?: boolean }>(record: T): Omit<T, "_dirty"> {
  const { _dirty, ...rest } = record;
  void _dirty;
  return rest;
}

async function pushDirty(): Promise<number> {
  const [dirtyClients, dirtyFridges, dirtyVisits, dirtyReminders] = await Promise.all([
    db.clients.filter((c) => c._dirty === true).toArray(),
    db.fridges.filter((f) => f._dirty === true).toArray(),
    db.visits.filter((v) => v._dirty === true).toArray(),
    db.reminders.filter((r) => r._dirty === true).toArray(),
  ]);

  const total =
    dirtyClients.length + dirtyFridges.length + dirtyVisits.length + dirtyReminders.length;
  if (total === 0) return 0;

  const response = await fetch(`${API_BASE}/sync/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clients: dirtyClients.map(stripDirty),
      fridges: dirtyFridges.map(stripDirty),
      visits: dirtyVisits.map(stripDirty),
      reminders: dirtyReminders.map(stripDirty),
    }),
  });

  if (!response.ok) throw new Error(`Push failed: ${response.status}`);

  const result = await response.json() as { synced: number; errors: string[] };

  await db.transaction("rw", db.clients, db.fridges, db.visits, db.reminders, async () => {
    await Promise.all([
      ...dirtyClients.map((c) => db.clients.update(c.id, { _dirty: false })),
      ...dirtyFridges.map((f) => db.fridges.update(f.id, { _dirty: false })),
      ...dirtyVisits.map((v) => db.visits.update(v.id, { _dirty: false })),
      ...dirtyReminders.map((r) => db.reminders.update(r.id, { _dirty: false })),
    ]);
  });

  return result.synced;
}

async function pullSince(since: number): Promise<number> {
  const response = await fetch(`${API_BASE}/sync/pull?since=${since}`);
  if (!response.ok) throw new Error(`Pull failed: ${response.status}`);

  const data = await response.json() as {
    clients: Client[];
    fridges: Fridge[];
    visits: Visit[];
    reminders: Reminder[];
    pulledAt: number;
  };

  const toMerge = (records: (Client | Fridge | Visit | Reminder)[]) =>
    records.map((r) => ({ ...r, _dirty: false }));

  await db.transaction("rw", db.clients, db.fridges, db.visits, db.reminders, async () => {
    await Promise.all([
      data.clients.length ? db.clients.bulkPut(toMerge(data.clients) as Client[]) : null,
      data.fridges.length ? db.fridges.bulkPut(toMerge(data.fridges) as Fridge[]) : null,
      data.visits.length ? db.visits.bulkPut(toMerge(data.visits) as Visit[]) : null,
      data.reminders.length ? db.reminders.bulkPut(toMerge(data.reminders) as Reminder[]) : null,
    ]);
  });

  setLastSyncAt(data.pulledAt ?? Date.now());

  return (
    data.clients.length +
    data.fridges.length +
    data.visits.length +
    data.reminders.length
  );
}

export async function runSync(): Promise<SyncResult> {
  if (!navigator.onLine) return { pushed: 0, pulled: 0, error: "offline" };

  // On native, skip sync entirely when no backend URL has been configured
  if (Capacitor.isNativePlatform() && !import.meta.env.VITE_API_URL) {
    return { pushed: 0, pulled: 0 };
  }

  try {
    const pushed = await pushDirty();
    const since = getLastSyncAt();
    const pulled = await pullSince(since);
    return { pushed, pulled };
  } catch (e) {
    // Network-level failures (no server, no internet) = treat as offline, not error
    if (isNetworkError(e)) {
      return { pushed: 0, pulled: 0, error: "offline" };
    }
    return { pushed: 0, pulled: 0, error: String(e) };
  }
}

export async function getDirtyCount(): Promise<number> {
  const [c, f, v, r] = await Promise.all([
    db.clients.filter((x) => x._dirty === true).count(),
    db.fridges.filter((x) => x._dirty === true).count(),
    db.visits.filter((x) => x._dirty === true).count(),
    db.reminders.filter((x) => x._dirty === true).count(),
  ]);
  return c + f + v + r;
}

export { getLastSyncAt };
