import { Capacitor } from "@capacitor/core";

export async function scanQRCode(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { BarcodeScanner, BarcodeFormat } = await import(
        "@capacitor-mlkit/barcode-scanning"
      );

      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== "granted" && camera !== "limited") return null;

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      return barcodes[0]?.rawValue ?? null;
    } catch {
      return null;
    }
  }
  // Web: return null so the caller falls back to the jsQR canvas scanner
  return null;
}
