"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AudioLines, Check, FilePlus2, HeartPulse, Loader2, Mic, Paperclip, Sparkles, UploadCloud } from "lucide-react";

import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { categoryLabels } from "@/lib/labels";
import type { ExtractionResult, VoiceResult } from "@/lib/types";

type Mode = "image" | "voice";

type CaptureIngestPayload = {
  ok: boolean;
  captureId?: string;
  reviewUrl?: string;
  result?: ExtractionResult;
  voiceResult?: VoiceResult;
  mode?: "mock" | "openai";
  error?: string;
};

export function CaptureView() {
  const [mode, setMode] = React.useState<Mode>("image");
  const params = useSearchParams();
  const patientName = params?.get("patientName") ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Capture"
        title="Make sense of the paperwork"
        description="Upload a memo, letter, appointment slip, or bill. Tandem pulls out the dates, tasks, and family updates for review."
        icon={Sparkles}
      />

      {patientName ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <HeartPulse className="size-4 text-primary" />
          <span>
            New update for{" "}
            <span className="font-bold text-foreground">{patientName}</span>.
          </span>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 rounded-2xl border bg-white/80 p-1">
        <button
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("image")}
        >
          Paperwork
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "voice" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("voice")}
        >
          Voice note
        </button>
      </div>

      {mode === "image" ? <ImageCapture /> : <VoiceCapture />}
    </div>
  );
}

function ImageCapture() {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [context, setContext] = React.useState("Doctor memo from SGH after Ah Muay's fall. Need to coordinate rehab transport and medication list.");
  const [result, setResult] = React.useState<ExtractionResult | null>(null);
  const [mode, setMode] = React.useState<"mock" | "openai" | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [captureId, setCaptureId] = React.useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function extract(useMock = false) {
    setLoading(true);
    setError(null);
    setCaptureId(null);
    setReviewUrl(null);
    const formData = new FormData();
    if (file && !useMock) formData.append("file", file);
    formData.append("context", context);
    formData.append("text", context);
    formData.append("sourceType", useMock ? "document" : file?.type.startsWith("image/") ? "image" : file ? "document" : "text");
    if (useMock) formData.append("demo", "true");

    try {
      const response = await fetch("/api/captures/ingest", { method: "POST", body: formData });
      const payload = (await response.json()) as CaptureIngestPayload;
      if (!response.ok || !payload.ok || !payload.result || !payload.captureId || !payload.reviewUrl) {
        throw new Error(payload.error || "Could not create a review item.");
      }
      setResult(payload.result);
      setMode(payload.mode ?? "mock");
      setCaptureId(payload.captureId);
      setReviewUrl(payload.reviewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a review item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="size-5 text-primary" />
            Add paperwork
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed bg-white/70 p-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              setFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <Paperclip className="size-8 text-primary" />
            <div className="mt-3 font-bold">{file ? file.name : "Drop or choose a photo or PDF"}</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              Doctor memo, discharge summary, prescription, HDB EASE letter, AIC grant letter, appointment slip, or bill.
            </div>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <Textarea value={context} onChange={(event) => setContext(event.target.value)} aria-label="Document context" />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => extract(false)} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Prepare for review
            </Button>
            <Button variant="outline" onClick={() => extract(true)} disabled={loading}>
              Use sample memo
            </Button>
          </div>
          {error ? <div className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card className="min-h-[28rem]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Ready for family review</CardTitle>
            {mode ? <Badge variant={mode === "openai" ? "success" : "warning"}>{mode === "openai" ? "OpenAI" : "Mock"}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="grid min-h-72 place-items-center rounded-3xl bg-muted p-6 text-center">
              <div>
                <FilePlus2 className="mx-auto size-8 text-primary" />
                <div className="mt-3 font-bold">Your review draft will appear here</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Nothing is added to the family record until someone approves it in the Inbox.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary">Check before saving</Badge>
                <h2 className="mt-3 text-2xl font-bold">{result.document_type}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.plain_english_summary}</p>
              </div>

              <InfoList title="Important dates" items={result.important_dates} />
              <InfoList title="People and institutions" items={result.people_or_institutions} />
              <InfoList title="Medication or care items" items={result.medications_or_care_items} />

              <div>
                <div className="mb-2 font-bold">Suggested next steps</div>
                <div className="space-y-2">
                  {result.recommended_tasks.map((task) => (
                    <div key={task.title} className="rounded-2xl border bg-white/70 p-3">
                      <div className="font-semibold">{task.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{categoryLabels[task.category]}</Badge>
                        <Badge variant={task.priority === "high" ? "alert" : "default"}>{task.priority}</Badge>
                        <Badge variant="secondary">{task.suggested_assignee}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-primary/5 p-3 text-sm leading-6">{result.family_update_message}</div>

              <Button onClick={() => reviewUrl && router.push(reviewUrl)} className="w-full" disabled={!captureId || !reviewUrl}>
                <Check />
                Open in Inbox
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function VoiceCapture() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [result, setResult] = React.useState<VoiceResult | null>(null);
  const [mode, setMode] = React.useState<"mock" | "openai" | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [captureId, setCaptureId] = React.useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
    recorder.onstop = () => {
      setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      stream.getTracks().forEach((track) => track.stop());
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setCaptureId(null);
    setReviewUrl(null);
    const formData = new FormData();
    if (text.trim()) formData.append("text", text);
    if (audioBlob) formData.append("file", audioBlob, "voice-update.webm");
    formData.append("sourceType", "voice");

    try {
      const response = await fetch("/api/captures/ingest", { method: "POST", body: formData });
      const payload = (await response.json()) as CaptureIngestPayload;
      if (!response.ok || !payload.ok || !payload.voiceResult || !payload.captureId || !payload.reviewUrl) {
        throw new Error(payload.error || "Could not create a voice review item.");
      }
      setResult(payload.voiceResult);
      setMode(payload.mode ?? "mock");
      setCaptureId(payload.captureId);
      setReviewUrl(payload.reviewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a voice review item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioLines className="size-5 text-primary" />
            Voice note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={toggleRecording} variant={recording ? "destructive" : "secondary"} className="w-full">
            <Mic />
            {recording ? "Stop recording" : audioBlob ? "Record again" : "Record voice note"}
          </Button>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Optional voice context"
            placeholder="Add names, places, or extra context if the voice note needs it."
          />
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Prepare voice note
          </Button>
          {error ? <div className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ready for family review</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="grid min-h-72 place-items-center rounded-3xl bg-muted p-6 text-center">
              <div>
                <Mic className="mx-auto size-8 text-primary" />
                <div className="mt-3 font-bold">Your voice note summary will appear here</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Transcript and next steps stay in review until the family saves them.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">Check before saving</Badge>
                {mode ? <Badge variant={mode === "openai" ? "success" : "warning"}>{mode === "openai" ? "OpenAI" : "Mock"}</Badge> : null}
              </div>
              <InfoList title="Transcript" items={[result.transcript]} />
              <InfoList title="Family update" items={[result.update_note]} />
              <div className="rounded-2xl border bg-white/70 p-3">
                <div className="font-bold">{result.suggested_task.title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{categoryLabels[result.suggested_task.category]}</Badge>
                  <Badge>{result.suggested_task.suggested_assignee}</Badge>
                  <Badge variant={result.suggested_task.priority === "high" ? "alert" : "default"}>{result.suggested_task.priority}</Badge>
                </div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-3 text-sm leading-6">{result.family_message}</div>
              <Button onClick={() => reviewUrl && router.push(reviewUrl)} disabled={!captureId || !reviewUrl} className="w-full">
                <Check />
                Open in Inbox
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold">{title}</div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item} className="rounded-2xl bg-muted px-3 py-2 text-sm leading-6">
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">Nothing important detected.</div>
        )}
      </div>
    </div>
  );
}
