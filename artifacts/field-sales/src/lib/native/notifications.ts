import { Capacitor } from "@capacitor/core";

function notifIdFromString(id: string): number {
  let hash = 0;
  for (const char of id) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

async function swReady(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

async function showWebNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await swReady();
    if (reg) {
      await reg.showNotification(title, { body, icon: "/icons/icon-192.svg" });
    } else {
      new Notification(title, { body, icon: "/icons/icon-192.svg" });
    }
  } catch {
    try {
      new Notification(title, { body });
    } catch {
      // silently ignore
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    } catch {
      return false;
    }
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function scheduleReminder(
  reminderId: string,
  title: string,
  body: string,
  at: Date
): Promise<void> {
  const delay = at.getTime() - Date.now();
  if (delay <= 0) return;

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") return;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifIdFromString(reminderId),
            title,
            body,
            schedule: { at },
            smallIcon: "ic_stat_icon_config_sample",
            iconColor: "#F40009",
          },
        ],
      });
    } catch {
      // native scheduling failed; silently fall through
    }
    return;
  }

  // Web fallback: setTimeout + Notification API
  setTimeout(() => showWebNotification(title, body), delay);
}

export async function cancelReminder(reminderId: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.cancel({
        notifications: [{ id: notifIdFromString(reminderId) }],
      });
    } catch {
      // silently ignore
    }
  }
  // Web setTimeout timers are not cancellable from here; they simply fire harmlessly if
  // the reminder is already completed/deleted by the time they fire.
}

export async function cancelAllReminders(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch {
      // silently ignore
    }
  }
}
