import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { Cloud, CloudOff, RefreshCw, CloudUpload, AlertCircle } from "lucide-react";

export function SyncBadge() {
  const { state, pendingCount, triggerSync } = useSyncStatus();

  const config: Record<
    typeof state,
    { icon: React.ElementType; label: string; className: string }
  > = {
    synced: {
      icon: Cloud,
      label: "Synced",
      className: "text-emerald-600 dark:text-emerald-400",
    },
    pending: {
      icon: CloudUpload,
      label: `${pendingCount} pending`,
      className: "text-amber-600 dark:text-amber-400",
    },
    syncing: {
      icon: RefreshCw,
      label: "Syncing…",
      className: "text-blue-600 dark:text-blue-400",
    },
    offline: {
      icon: CloudOff,
      label: "Offline",
      className: "text-muted-foreground",
    },
    error: {
      icon: AlertCircle,
      label: "Sync error",
      className: "text-destructive",
    },
  };

  const { icon: Icon, label, className } = config[state];

  return (
    <button
      onClick={state !== "offline" && state !== "syncing" ? triggerSync : undefined}
      className={cn(
        "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors",
        "hover:bg-muted/60 active:scale-95",
        className,
      )}
      title={state === "synced" ? "All changes saved to cloud" : label}
    >
      <Icon
        className={cn("w-3 h-3 shrink-0", state === "syncing" && "animate-spin")}
        strokeWidth={2}
      />
      <span>{label}</span>
    </button>
  );
}
