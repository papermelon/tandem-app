"use client";

import * as React from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource | ImageBitmap | Blob) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (raw: string) => void;
};

export function QRScannerModal({ open, onClose, onResult }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [supported, setSupported] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    const ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    setSupported(Boolean(ctor));

    if (!ctor) return;
    const detector = new ctor({ formats: ["qr_code"] });
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              onResult(codes[0].rawValue);
              return;
            }
          } catch {
            // some frames fail to decode; keep scanning
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setError("Couldn't access the camera. You can upload a QR image instead.");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onResult]);

  if (!open) return null;

  const handleImage = async (file: File | null) => {
    if (!file) return;
    const ctor = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!ctor) {
      setError("This browser can't decode QR codes. Try Chrome on Android or Safari 17+.");
      return;
    }
    try {
      const detector = new ctor({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      if (codes[0]?.rawValue) onResult(codes[0].rawValue);
      else setError("No QR code found in that image.");
    } catch {
      setError("Couldn't read the QR code from that image.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan handover QR"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Scan handover QR</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 aspect-square w-full overflow-hidden rounded-2xl bg-black">
          {supported ? (
            <video ref={videoRef} className="size-full object-cover" playsInline muted />
          ) : (
            <div className="grid size-full place-items-center p-6 text-center text-sm text-white/80">
              <div>
                <Camera className="mx-auto mb-2 size-8 opacity-70" />
                Live scanning isn't supported in this browser. Upload an image of the QR code instead.
              </div>
            </div>
          )}
        </div>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => fileRef.current?.click()}>
            <ImageIcon className="size-4" />
            Upload image
          </Button>
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
