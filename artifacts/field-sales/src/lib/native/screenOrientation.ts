import { Capacitor } from "@capacitor/core";

export async function lockPortrait(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { ScreenOrientation } = await import("@capacitor/screen-orientation");
    await ScreenOrientation.lock({ orientation: "portrait" });
  } catch {
    // silently ignore — older devices may not support it
  }
}

export async function unlockOrientation(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { ScreenOrientation } = await import("@capacitor/screen-orientation");
    await ScreenOrientation.unlock();
  } catch {
    // silently ignore
  }
}

export async function getCurrentOrientation(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return screen.orientation?.type ?? null;
  }
  try {
    const { ScreenOrientation } = await import("@capacitor/screen-orientation");
    const result = await ScreenOrientation.orientation();
    return result.type;
  } catch {
    return null;
  }
}
