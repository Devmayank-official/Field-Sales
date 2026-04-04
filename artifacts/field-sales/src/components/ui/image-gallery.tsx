import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppImage } from "@/lib/schema";

interface ImageGalleryProps {
  images: AppImage[];
  onDelete?: (id: string) => void;
}

export function ImageGallery({ images, onDelete }: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<AppImage | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
            <img
              src={img.thumbnailRef ?? img.fileRef}
              alt={img.caption ?? "photo"}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightbox(img)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="w-6 h-6 text-white drop-shadow" />
            </div>
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(img.id);
                }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {img.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-1 truncate">
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:bg-white/10"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={lightbox.fileRef}
            alt={lightbox.caption ?? "photo"}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.caption && (
            <p className="absolute bottom-8 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
              {lightbox.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}
