import { db } from "../db/dexieDb";
import type { AppImage } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

const MAX_SIZE = 1200;
const QUALITY = 0.75;

async function compressImage(dataUrl: string): Promise<{ full: string; thumb: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const thumbCanvas = document.createElement("canvas");

      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      const thumbW = Math.round(width / 4);
      const thumbH = Math.round(height / 4);
      thumbCanvas.width = thumbW;
      thumbCanvas.height = thumbH;
      thumbCanvas.getContext("2d")!.drawImage(img, 0, 0, thumbW, thumbH);

      resolve({
        full: canvas.toDataURL("image/jpeg", QUALITY),
        thumb: thumbCanvas.toDataURL("image/jpeg", 0.6),
      });
    };
    img.src = dataUrl;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const imageRepo = {
  getByEntity: async (entityType: AppImage["entityType"], entityId: string) =>
    db.images
      .where("entityId")
      .equals(entityId)
      .filter((i) => i.entityType === entityType)
      .sortBy("createdAt"),

  getAll: async () => db.images.orderBy("createdAt").toArray(),

  add: async (
    entityType: AppImage["entityType"],
    entityId: string,
    file: File,
    caption?: string
  ): Promise<AppImage> => {
    const raw = await fileToDataUrl(file);
    const { full, thumb } = await compressImage(raw);
    const img: AppImage = {
      id: uuidv4(),
      entityType,
      entityId,
      fileRef: full,
      thumbnailRef: thumb,
      caption,
      createdAt: Date.now(),
    };
    await db.images.add(img);
    return img;
  },

  delete: async (id: string) => db.images.delete(id),

  deleteByEntity: async (entityType: AppImage["entityType"], entityId: string) =>
    db.images
      .where("entityId")
      .equals(entityId)
      .filter((i) => i.entityType === entityType)
      .delete(),
};
