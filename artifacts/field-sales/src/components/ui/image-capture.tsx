import { useRef, useState } from "react";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { capturePhoto, pickFromGallery, dataUrlToFile } from "@/lib/native/camera";
import type { AppImage } from "@/lib/schema";

interface ImageCaptureProps {
  entityType: AppImage["entityType"];
  entityId: string;
  onCapture: (file: File) => Promise<unknown>;
  label?: string;
}

export function ImageCapture({ onCapture, label = "Add Photo" }: ImageCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      await onCapture(file);
    } catch {
      toast({ title: "Failed to save image", variant: "destructive" });
    } finally {
      setLoading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const handleNativeCapture = async (source: "camera" | "gallery") => {
    setLoading(true);
    try {
      const photo = source === "camera" ? await capturePhoto() : await pickFromGallery();
      if (!photo) return;
      const file = dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.${photo.format}`);
      await onCapture(file);
    } catch {
      toast({ title: "Failed to save image", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraClick = () => {
    if (Capacitor.isNativePlatform()) {
      handleNativeCapture("camera");
    } else {
      cameraRef.current?.click();
    }
  };

  const handleGalleryClick = () => {
    if (Capacitor.isNativePlatform()) {
      handleNativeCapture("gallery");
    } else {
      galleryRef.current?.click();
    }
  };

  return (
    <>
      {/* Hidden inputs — used only on web */}
      {!Capacitor.isNativePlatform() && (
        <>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 rounded-xl border-dashed border-2 flex items-center justify-center gap-2 text-muted-foreground bg-transparent hover:bg-muted/50"
          onClick={handleCameraClick}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          <span className="text-sm">{loading ? "Saving..." : label === "Add Photo" ? "Camera" : label}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 rounded-xl border-dashed border-2 flex items-center justify-center gap-2 text-muted-foreground bg-transparent hover:bg-muted/50"
          onClick={handleGalleryClick}
          disabled={loading}
        >
          <ImageIcon className="w-4 h-4" />
          <span className="text-sm">Gallery</span>
        </Button>
      </div>
    </>
  );
}
