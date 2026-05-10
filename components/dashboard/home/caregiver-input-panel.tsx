"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ImageIcon, Loader2, Paperclip, Send, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CareRecipient } from "@/lib/types";

type CaptureIngestPayload = {
  ok: boolean;
  captureId?: string;
  reviewUrl?: string;
  error?: string;
};

type Props = {
  patient: CareRecipient;
};

export function CaregiverInputPanel({ patient }: Props) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = React.useState<string | null>(null);

  const hasInput = text.trim().length > 0 || Boolean(file);

  async function submitInput() {
    if (!hasInput) return;

    setLoading(true);
    setError(null);
    setReviewUrl(null);

    const context = [
      `Care recipient: ${patient.name}`,
      patient.relationship ? `Relationship: ${patient.relationship}` : undefined,
      patient.context ? `Care context: ${patient.context}` : undefined
    ]
      .filter(Boolean)
      .join("\n");

    const formData = new FormData();
    formData.append("sourceType", file ? "image" : "text");
    formData.append("text", text);
    formData.append("context", context);
    formData.append("careRecipientId", patient.id);
    if (file) formData.append("file", file);

    try {
      const response = await fetch("/api/captures/ingest", { method: "POST", body: formData });
      const payload = (await response.json()) as CaptureIngestPayload;
      if (!response.ok || !payload.ok || !payload.reviewUrl) {
        throw new Error(payload.error || "Could not share this update.");
      }

      setReviewUrl(payload.reviewUrl);
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share this update.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white/75 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Share a care update</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Add a note or image for the family to review and save into {patient.name}&apos;s care databank.
          </p>
        </div>
        <Badge variant="secondary">Family inbox</Badge>
      </div>

      <div className="mt-3 space-y-3">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={`Care update for ${patient.name}`}
          placeholder={`What should the family know about ${patient.name}?`}
          className="min-h-24"
        />

        {file ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <ImageIcon className="size-4 shrink-0 text-primary" />
              <span className="truncate font-medium">{file.name}</span>
            </div>
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Remove selected image"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="justify-start"
          >
            <Paperclip />
            Add image
          </Button>
          <Button type="button" onClick={submitInput} disabled={!hasInput || loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
            Share for review
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        {reviewUrl ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-2 font-semibold text-primary">
              <Check className="size-4" />
              Sent to review
            </span>
            <Link href={reviewUrl} className="font-semibold text-primary underline-offset-4 hover:underline">
              Open inbox
            </Link>
          </div>
        ) : null}

        {error ? <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
      </div>
    </section>
  );
}
