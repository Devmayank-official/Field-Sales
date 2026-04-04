import { useRef, useEffect, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, AlertCircle, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { scanQRCode } from "@/lib/native/scanner";

interface QrScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (value: string) => void;
}

export function QrScanner({ open, onOpenChange, onScan }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [nativeScanning, setNativeScanning] = useState(false);
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleSuccess = useCallback((value: string) => {
    setScanned(true);
    stopCamera();
    onScan(value);
    setTimeout(() => onOpenChange(false), 150);
  }, [stopCamera, onScan, onOpenChange]);

  const scan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scan);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    if (code?.data) {
      handleSuccess(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(scan);
  }, [handleSuccess]);

  const startCamera = useCallback(async () => {
    setError(null);
    setScanned(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          rafRef.current = requestAnimationFrame(scan);
        };
      }
    } catch {
      setError("Camera access denied. You can still scan from your gallery below.");
    }
  }, [scan]);

  const handleNativeScan = useCallback(async () => {
    setNativeScanning(true);
    try {
      const result = await scanQRCode();
      if (result) {
        handleSuccess(result);
      } else {
        // User cancelled native scanner
        onOpenChange(false);
      }
    } catch {
      setError("Scanner unavailable. Use gallery below.");
    } finally {
      setNativeScanning(false);
    }
  }, [handleSuccess, onOpenChange]);

  useEffect(() => {
    if (open) {
      if (Capacitor.isNativePlatform()) {
        handleNativeScan();
      } else {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera, handleNativeScan]);

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const offscreen = document.createElement("canvas");
      offscreen.width = bitmap.width;
      offscreen.height = bitmap.height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
      if (code?.data) {
        handleSuccess(code.data);
      } else {
        toast({ title: "No QR code found in image", variant: "destructive" });
      }
    } catch {
      toast({ title: "Could not read image", variant: "destructive" });
    } finally {
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  // Native: show minimal UI while scanner overlay is active
  if (Capacitor.isNativePlatform()) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(o); }}>
        <DialogContent className="p-0 max-w-sm w-[92vw] rounded-2xl overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" /> Scan QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-6 text-center space-y-3">
            {nativeScanning ? (
              <p className="text-sm text-muted-foreground">Opening camera scanner…</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {/* Gallery fallback for native too */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGalleryChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 rounded-xl gap-2 text-sm"
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4" />
              Select from Gallery
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopCamera(); onOpenChange(o); }}>
      <DialogContent className="p-0 max-w-sm w-[92vw] rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" /> Scan QR Code
          </DialogTitle>
        </DialogHeader>

        {/* Camera viewfinder */}
        <div className="relative bg-black" style={{ aspectRatio: "1/1" }}>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Corner markers */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-56">
              <div className="absolute inset-0 rounded-xl" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }} />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-xl" />
              {!error && !scanned && (
                <div className="absolute inset-0 flex items-end justify-center pb-2">
                  <span className="text-white/70 text-xs">Point camera at QR code</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white text-sm text-center p-6 gap-3">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p>{error}</p>
            </div>
          )}

          {scanned && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold">
                Code detected!
              </div>
            </div>
          )}
        </div>

        {/* Gallery fallback */}
        <div className="px-4 py-3">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGalleryChange}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 rounded-xl gap-2 text-sm"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon className="w-4 h-4" />
            Select from Gallery
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
