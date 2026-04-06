import { Capacitor } from "@capacitor/core";

export interface CapturedPhoto {
  dataUrl: string;
  format: string;
}

export async function capturePhoto(): Promise<CapturedPhoto | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 1280,
      });
      if (!photo.dataUrl) return null;
      return { dataUrl: photo.dataUrl, format: photo.format };
    } catch {
      return null;
    }
  }
  return null;
}

export async function pickFromGallery(): Promise<CapturedPhoto | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        correctOrientation: true,
        width: 1280,
      });
      if (!photo.dataUrl) return null;
      return { dataUrl: photo.dataUrl, format: photo.format };
    } catch {
      return null;
    }
  }
  return null;
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const array = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new File([array], filename, { type: mime });
}
