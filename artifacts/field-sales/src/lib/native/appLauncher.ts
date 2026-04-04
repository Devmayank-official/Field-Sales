import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";

export async function openMapsNavigation(address: string): Promise<void> {
  const encoded = encodeURIComponent(address);
  if (!Capacitor.isNativePlatform()) {
    window.open(`https://maps.google.com/?q=${encoded}`, "_blank");
    return;
  }
  const appleUrl = `maps://?q=${encoded}`;
  const { completed } = await AppLauncher.openUrl({ url: appleUrl }).catch(() => ({ completed: false }));
  if (!completed) {
    await AppLauncher.openUrl({ url: `https://maps.google.com/?q=${encoded}` }).catch(() => {
      window.open(`https://maps.google.com/?q=${encoded}`, "_blank");
    });
  }
}
