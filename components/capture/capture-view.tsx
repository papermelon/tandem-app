"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AudioLines, Check, FilePlus2, HeartPulse, Loader2, Mic, Paperclip, Sparkles, UploadCloud } from "lucide-react";

import { PageHeading } from "@/components/shared/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCareData } from "@/components/providers/care-data-provider";
import { categoryLabels } from "@/lib/labels";
import { normalizeDueDate } from "@/lib/task-utils";
import type { ExtractionResult, VoiceResult } from "@/lib/types";

type Mode = "image" | "voice";

export function CaptureView() {
  const [mode, setMode] = React.useState<Mode>("image");
  const params = useSearchParams();
  const patientName = params?.get("patientName") ?? null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeading
        eyebrow="Capture"
        title="Turn care fragments into shared records"
        description="Upload a memo, letter, appointment slip, or bill. AI drafts the record and tasks; the family reviews before saving."
        icon={Sparkles}
      />

      {patientName ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <HeartPulse className="size-4 text-primary" />
          <span>
            New instruction for{" "}
            <span className="font-bold text-foreground">{patientName}</span>.
          </span>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 rounded-2xl border bg-white/80 p-1">
        <button
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "image" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("image")}
        >
          Image to record
        </button>
        <button
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === "voice" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setMode("voice")}
        >
          Voice to task
        </button>
      </div>

      {mode === "image" ? <ImageCapture /> : <VoiceCapture />}
    </div>
  );
}

function ImageCapture() {
  const { addDocument, addTasks, addTimelineItem, memberIdByName } = useCareData();
  const [file, setFile] = React.useState<File | null>(null);
  const [context, setContext] = React.useState("Doctor memo from SGH after Ah Muay's fall. Need to coordinate rehab transport and medication list.");
  const [result, setResult] = React.useState<ExtractionResult | null>(null);
  const [mode, setMode] = React.useState<"mock" | "openai" | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [storagePath, setStoragePath] = React.useState<string | undefined>();

  async function extract(useMock = false) {
    setLoading(true);
    setSaved(false);
    const formData = new FormData();
    if (file && !useMock) formData.append("file", file);
    formData.append("context", context);

    try {
      const response = await fetch("/api/ai/extract", { method: "POST", body: formData });
      const payload = (await response.json()) as {
        result: ExtractionResult;
        mode: "mock" | "openai";
        storagePath?: string;
      };
      setResult(payload.result);
      setMode(payload.mode);
      setStoragePath(payload.storagePath);
    } finally {
      setLoading(false);
    }
  }

  function saveResult() {
    if (!result) return;

    const document = addDocument({
      documentType: result.document_type,
      title: result.document_type,
      summary: result.plain_english_summary,
      uploadedById: "rachel",
      storagePath,
      importantDates: result.important_dates,
      institutions: result.people_or_institutions,
      careItems: result.medications_or_care_items
    });

    const createdTasks = addTasks(
      result.recommended_tasks.map((task) => ({
        title: task.title,
        category: task.category,
        assigneeId: memberIdByName(task.suggested_assignee),
        dueDate: normalizeDueDate(task.due_date),
        status: memberIdByName(task.suggested_assignee) ? "claimed" : "unclaimed",
        priority: task.priority,
        linkedRecordId: document.id,
        notes: result.family_update_message
      }))
    );

    addTimelineItem({
      type: "document",
      title: `${result.document_type} added`,
      description: result.family_update_message,
      authorId: "rachel",
      linkedRecordId: document.id,
      linkedTaskIds: createdTasks.map((task) => task.id)
    });

    setSaved(true);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="size-5 text-primary" />
            Upload document
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
            <div className="mt-3 font-bold">{file ? file.name : "Drop or choose an image or PDF"}</div>
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
              Extract record
            </Button>
            <Button variant="outline" onClick={() => extract(true)} disabled={loading}>
              Use demo memo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-[28rem]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Review before saving</CardTitle>
            {mode ? <Badge variant={mode === "openai" ? "success" : "warning"}>{mode === "openai" ? "OpenAI" : "Mock"}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="grid min-h-72 place-items-center rounded-3xl bg-muted p-6 text-center">
              <div>
                <FilePlus2 className="mx-auto size-8 text-primary" />
                <div className="mt-3 font-bold">AI draft will appear here</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Nothing is saved until you tap Add to Tandem.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary">Review before saving</Badge>
                <h2 className="mt-3 text-2xl font-bold">{result.document_type}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.plain_english_summary}</p>
              </div>

              <InfoList title="Important dates" items={result.important_dates} />
              <InfoList title="People and institutions" items={result.people_or_institutions} />
              <InfoList title="Medication or care items" items={result.medications_or_care_items} />

              <div>
                <div className="mb-2 font-bold">Suggested tasks</div>
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

              <Button onClick={saveResult} className="w-full" disabled={saved}>
                <Check />
                {saved ? "Added to Tandem" : "Add to Tandem"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function VoiceCapture() {
  const { addTasks, addTimelineItem, memberIdByName } = useCareData();
  const [text, setText] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [result, setResult] = React.useState<VoiceResult | null>(null);
  const [mode, setMode] = React.useState<"mock" | "openai" | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
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
    setSaved(false);
    const formData = new FormData();
    if (text.trim()) formData.append("text", text);
    if (audioBlob) formData.append("audio", audioBlob, "voice-update.webm");

    try {
      const response = await fetch("/api/ai/voice", { method: "POST", body: formData });
      const payload = (await response.json()) as { result: VoiceResult; mode: "mock" | "openai" };
      setResult(payload.result);
      setMode(payload.mode);
    } finally {
      setLoading(false);
    }
  }

  function saveVoice() {
    if (!result) return;
    const assigneeId = memberIdByName(result.suggested_task.suggested_assignee);
    const [task] = addTasks([
      {
        title: result.suggested_task.title,
        category: result.suggested_task.category,
        assigneeId,
        dueDate: normalizeDueDate(result.suggested_task.due_date),
        status: assigneeId ? "claimed" : "unclaimed",
        priority: result.suggested_task.priority,
        notes: result.reminder
      }
    ]);

    addTimelineItem({
      type: "voice update",
      title: "Voice update captured",
      description: result.family_message,
      authorId: "rachel",
      linkedTaskIds: [task.id]
    });
    setSaved(true);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioLines className="size-5 text-primary" />
            Voice update
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
            placeholder="Optional context if the recording needs names, places, or a typed fallback."
          />
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate task
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            This MVP uses MediaRecorder when available and keeps the architecture ready for future GPT Realtime voice integrations.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review voice result</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="grid min-h-72 place-items-center rounded-3xl bg-muted p-6 text-center">
              <div>
                <Mic className="mx-auto size-8 text-primary" />
                <div className="mt-3 font-bold">Voice task draft appears here</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Transcription and task creation are reviewable before saving.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">Review before saving</Badge>
                {mode ? <Badge variant={mode === "openai" ? "success" : "warning"}>{mode === "openai" ? "OpenAI" : "Mock"}</Badge> : null}
              </div>
              <InfoList title="Transcript" items={[result.transcript]} />
              <InfoList title="Update note" items={[result.update_note]} />
              <div className="rounded-2xl border bg-white/70 p-3">
                <div className="font-bold">{result.suggested_task.title}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{categoryLabels[result.suggested_task.category]}</Badge>
                  <Badge>{result.suggested_task.suggested_assignee}</Badge>
                  <Badge variant={result.suggested_task.priority === "high" ? "alert" : "default"}>{result.suggested_task.priority}</Badge>
                </div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-3 text-sm leading-6">{result.family_message}</div>
              <Button onClick={saveVoice} disabled={saved} className="w-full">
                <Check />
                {saved ? "Added to Tandem" : "Add voice update"}
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
