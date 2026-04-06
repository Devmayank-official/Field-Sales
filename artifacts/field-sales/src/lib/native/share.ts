import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "NotAllowedError");
}

export async function shareText(title: string, text: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text });
      } catch (err) {
        if (isAbortError(err)) return;
        await navigator.clipboard.writeText(text).catch(() => {});
      }
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    return;
  }
  try {
    await Share.share({ title, text });
  } catch (err) {
    if (isAbortError(err)) return;
    throw err;
  }
}
