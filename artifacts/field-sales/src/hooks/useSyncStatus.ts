import { useState, useEffect, useCallback, useRef } from "react";
import { runSync, getDirtyCount, getLastSyncAt } from "@/services/syncService";

export type SyncState = "synced" | "pending" | "syncing" | "offline" | "error";

export interface SyncStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncAt: number;
  isSyncing: boolean;
  triggerSync: () => void;
}

export function useSyncStatus(): SyncStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(getLastSyncAt());
  const [hasError, setHasError] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggerSyncRef = useRef<() => void | Promise<void>>(() => {});

  const refreshPending = useCallback(async () => {
    const count = await getDirtyCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    setHasError(false);
    try {
      const result = await runSync();
      if (result.error && result.error !== "offline") {
        setHasError(true);
      } else {
        setLastSyncAt(getLastSyncAt());
      }
      await refreshPending();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, refreshPending]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [triggerSync]);

  useEffect(() => {
    refreshPending();
    const interval = setInterval(refreshPending, 10_000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  useEffect(() => {
    triggerSyncRef.current = triggerSync;
  }, [triggerSync]);

  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      triggerSyncRef.current();
    }, 60_000);
    syncTimerRef.current = interval;
    triggerSyncRef.current();
    return () => clearInterval(interval);
  }, [isOnline]);

  let state: SyncState = "synced";
  if (!isOnline) state = "offline";
  else if (isSyncing) state = "syncing";
  else if (hasError) state = "error";
  else if (pendingCount > 0) state = "pending";

  return { state, pendingCount, lastSyncAt, isSyncing, triggerSync };
}
