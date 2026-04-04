import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";

export async function setAppBadge(count: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (count === 0) {
      await Badge.clear();
    } else {
      await Badge.set({ count });
    }
  } catch {
    // badge permission not granted — ignore silently
  }
}

export async function requestBadgePermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Badge.requestPermissions();
  } catch {
    // ignore
  }
}
