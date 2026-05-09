"use client";

import * as React from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (dataUrl: string) => void;
};

export function AvatarUploadModal({ open, onClose, onPick }: Props) {
  const albumRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onPick(reader.result);
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Update photo"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Update photo</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <Button
            variant="soft"
            className="w-full justify-start gap-3"
            onClick={() => albumRef.current?.click()}
          >
            <ImageIcon className="size-4" />
            Choose from album
          </Button>
          <Button
            variant="soft"
            className="w-full justify-start gap-3"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="size-4" />
            Take a picture
          </Button>
        </div>

        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
