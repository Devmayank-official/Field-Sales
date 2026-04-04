import { Capacitor } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";

export async function copyToClipboard(text: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    await navigator.clipboard.writeText(text);
    return;
  }
  await Clipboard.write({ string: text });
}
