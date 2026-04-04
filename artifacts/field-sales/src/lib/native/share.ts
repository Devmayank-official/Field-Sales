import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export async function shareText(title: string, text: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, text });
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    return;
  }
  await Share.share({ title, text });
}
