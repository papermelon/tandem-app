import { createSupabaseAdmin } from "@/lib/supabase/server";
import { applyRoutingForCapture, recordReassignment } from "@/lib/routing-server";
import { asTaskCategory, asTaskPriority, normalizeDueDate } from "@/lib/task-utils";
import type { CaptureEvent, CaptureSourceType, ExtractedItem, ExtractionResult } from "@/lib/types";

export const CARE_CIRCLE_ID = "circle-mum";
const DEFAULT_AUTHOR_ID = "rachel";

type ExtractedItemRow = {
  id: string;
  capture_event_id: string;
  item_type: ExtractedItem["type"];
  title: string;
  summary: string;
  status: ExtractedItem["status"];
  assigned_to_id?: string | null;
  due_at?: string | null;
  priority?: ExtractedItem["priority"] | null;
  category?: ExtractedItem["category"] | null;
  structured_data?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CaptureRow = {
  id: string;
  platform: CaptureEvent["platform"];
  source_type: CaptureEvent["sourceType"];
  sender_name?: string | null;
  platform_sender_id?: string | null;
  platform_message_id?: string | null;
  original_file_path?: string | null;
  original_file_name?: string | null;
  original_file_mime_type?: string | null;
  raw_text?: string | null;
  extracted_text?: string | null;
  ai_summary?: string | null;
  status: CaptureEvent["status"];
  extraction_json?: ExtractionResult | null;
  created_at: string;
  updated_at: string;
  extracted_items?: ExtractedItemRow[] | null;
};

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function dropUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function senderNameFromTelegramUser(user?: { first_name?: string; last_name?: string; username?: string }) {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  return name || user?.username || "Telegram user";
}

function itemRowsFromExtraction(captureId: string, result: ExtractionResult, careCircleId: string) {
  const now = new Date().toISOString();
  const rows: Array<{
    id: string;
    capture_event_id: string;
    care_circle_id: string;
    item_type: string;
    title: string;
    summary: string;
    status: string;
    due_at?: string;
    priority?: string;
    category?: string;
    structured_data: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }> = [
    {
      id: makeId("item"),
      capture_event_id: captureId,
      care_circle_id: careCircleId,
      item_type: "document",
      title: result.document_type || "Care document",
      summary: result.plain_english_summary,
      status: "pending",
      structured_data: {
        document_type: result.document_type,
        important_dates: result.important_dates,
        people_or_institutions: result.people_or_institutions,
        medications_or_care_items: result.medications_or_care_items
      },
      created_at: now,
      updated_at: now
    }
  ];

  if (result.medications_or_care_items.length > 0) {
    rows.push({
      id: makeId("item"),
      capture_event_id: captureId,
      care_circle_id: careCircleId,
      item_type: "medication",
      title: "Medication and care items to review",
      summary: result.medications_or_care_items.join(", "),
      status: "pending",
      structured_data: { medications_or_care_items: result.medications_or_care_items },
      created_at: now,
      updated_at: now
    });
  }

  result.recommended_tasks.forEach((task) => {
    const category = asTaskCategory(task.category);
    rows.push({
      id: makeId("item"),
      capture_event_id: captureId,
      care_circle_id: careCircleId,
      item_type: category === "appointment" ? "appointment" : "task",
      title: task.title,
      summary: result.family_update_message,
      status: "pending",
      due_at: normalizeDueDate(task.due_date),
      priority: asTaskPriority(task.priority),
      category,
      structured_data: { ...task },
      created_at: now,
      updated_at: now
    });
  });

  return rows;
}

function mapExtractedItem(row: ExtractedItemRow): ExtractedItem {
  return {
    id: row.id,
    captureEventId: row.capture_event_id,
    type: row.item_type,
    title: row.title,
    summary: row.summary,
    status: row.status,
    assignedToId: row.assigned_to_id ?? undefined,
    dueAt: row.due_at ?? undefined,
    priority: row.priority ?? undefined,
    category: row.category ?? undefined,
    structuredData: row.structured_data ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function signedUrl(storagePath?: string | null) {
  if (!storagePath) return undefined;
  const supabase = createSupabaseAdmin();
  if (!supabase) return undefined;

  const { data } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60 * 60);
  return data?.signedUrl;
}

export async function createCaptureFromExtraction(input: {
  platform: "telegram" | "web";
  sourceType: CaptureSourceType;
  result: ExtractionResult;
  senderName?: string;
  platformSenderId?: string;
  platformMessageId?: string;
  originalFilePath?: string;
  originalFileName?: string;
  originalFileMimeType?: string;
  rawText?: string;
  extractedText?: string;
  careCircleId?: string;
}) {
  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  const now = new Date().toISOString();
  const captureId = makeId("cap");
  const careCircleId = input.careCircleId ?? CARE_CIRCLE_ID;
  const captureRow = dropUndefined({
    id: captureId,
    care_circle_id: careCircleId,
    platform: input.platform,
    source_type: input.sourceType,
    status: "pending_review",
    platform_message_id: input.platformMessageId,
    platform_sender_id: input.platformSenderId,
    sender_name: input.senderName,
    original_file_path: input.originalFilePath,
    original_file_name: input.originalFileName,
    original_file_mime_type: input.originalFileMimeType,
    raw_text: input.rawText,
    extracted_text: input.extractedText,
    ai_summary: input.result.plain_english_summary,
    extraction_json: input.result,
    created_at: now,
    updated_at: now
  });

  const captureResult = await supabase.from("capture_events").insert(captureRow);
  if (captureResult.error) throw captureResult.error;

  const itemResult = await supabase.from("extracted_items").insert(itemRowsFromExtraction(captureId, input.result, careCircleId));
  if (itemResult.error) throw itemResult.error;

  try {
    await applyRoutingForCapture(supabase, captureId);
  } catch {
    // Routing is best-effort — items remain pending without suggestions.
  }

  return captureId;
}

export async function listCaptureEvents(status = "pending_review"): Promise<CaptureEvent[]> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("capture_events")
    .select("*")
    .eq("care_circle_id", CARE_CIRCLE_ID)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const captureRows = (data ?? []) as CaptureRow[];
  const captureIds = captureRows.map((row) => row.id);
  let itemsByCaptureId = new Map<string, ExtractedItemRow[]>();

  if (captureIds.length > 0) {
    const itemsResult = await supabase.from("extracted_items").select("*").in("capture_event_id", captureIds);
    if (itemsResult.error) throw itemsResult.error;

    itemsByCaptureId = ((itemsResult.data ?? []) as ExtractedItemRow[]).reduce((items, row) => {
      const rows = items.get(row.capture_event_id) ?? [];
      rows.push(row);
      items.set(row.capture_event_id, rows);
      return items;
    }, new Map<string, ExtractedItemRow[]>());
  }

  return Promise.all(
    captureRows.map(async (row) => ({
      id: row.id,
      platform: row.platform,
      sourceType: row.source_type,
      senderName: row.sender_name ?? undefined,
      platformSenderId: row.platform_sender_id ?? undefined,
      platformMessageId: row.platform_message_id ?? undefined,
      originalFilePath: row.original_file_path ?? undefined,
      originalFileUrl: await signedUrl(row.original_file_path),
      originalFileName: row.original_file_name ?? undefined,
      originalFileMimeType: row.original_file_mime_type ?? undefined,
      rawText: row.raw_text ?? undefined,
      extractedText: row.extracted_text ?? undefined,
      aiSummary: row.ai_summary ?? undefined,
      status: row.status,
      extractionJson: row.extraction_json ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: (itemsByCaptureId.get(row.id) ?? []).map(mapExtractedItem)
    }))
  );
}

export async function listCaptureEventsByIds(captureIds: string[]): Promise<CaptureEvent[]> {
  const supabase = createSupabaseAdmin();
  if (!supabase || captureIds.length === 0) return [];

  const { data, error } = await supabase
    .from("capture_events")
    .select("*")
    .in("id", captureIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const captureRows = (data ?? []) as CaptureRow[];
  const ids = captureRows.map((row) => row.id);
  let itemsByCaptureId = new Map<string, ExtractedItemRow[]>();

  if (ids.length > 0) {
    const itemsResult = await supabase.from("extracted_items").select("*").in("capture_event_id", ids);
    if (itemsResult.error) throw itemsResult.error;

    itemsByCaptureId = ((itemsResult.data ?? []) as ExtractedItemRow[]).reduce((items, row) => {
      const rows = items.get(row.capture_event_id) ?? [];
      rows.push(row);
      items.set(row.capture_event_id, rows);
      return items;
    }, new Map<string, ExtractedItemRow[]>());
  }

  return Promise.all(
    captureRows.map(async (row) => ({
      id: row.id,
      platform: row.platform,
      sourceType: row.source_type,
      senderName: row.sender_name ?? undefined,
      platformSenderId: row.platform_sender_id ?? undefined,
      platformMessageId: row.platform_message_id ?? undefined,
      originalFilePath: row.original_file_path ?? undefined,
      originalFileUrl: await signedUrl(row.original_file_path),
      originalFileName: row.original_file_name ?? undefined,
      originalFileMimeType: row.original_file_mime_type ?? undefined,
      rawText: row.raw_text ?? undefined,
      extractedText: row.extracted_text ?? undefined,
      aiSummary: row.ai_summary ?? undefined,
      status: row.status,
      extractionJson: row.extraction_json ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: (itemsByCaptureId.get(row.id) ?? []).map(mapExtractedItem)
    }))
  );
}

export async function ignoreCapture(captureId: string) {
  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  const now = new Date().toISOString();
  const [captureResult, itemsResult] = await Promise.all([
    supabase.from("capture_events").update({ status: "ignored", updated_at: now }).eq("id", captureId),
    supabase.from("extracted_items").update({ status: "deleted", updated_at: now }).eq("capture_event_id", captureId)
  ]);

  if (captureResult.error) throw captureResult.error;
  if (itemsResult.error) throw itemsResult.error;
}

export async function approveCapture(captureId: string) {
  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  const { data: capture, error } = await supabase
    .from("capture_events")
    .select("*, extracted_items(*)")
    .eq("id", captureId)
    .single();

  if (error) throw error;
  if (!capture) throw new Error("Capture not found.");

  const result = capture.extraction_json as ExtractionResult;
  const now = new Date().toISOString();
  const documentId = makeId("doc");
  const timelineId = makeId("tl");
  const captureRow = capture as CaptureRow;
  const careCircleId = (capture as { care_circle_id?: string }).care_circle_id ?? CARE_CIRCLE_ID;
  const circleResult = await supabase.from("care_circles").select("created_by").eq("id", careCircleId).maybeSingle();
  if (circleResult.error) throw circleResult.error;
  const authorId = circleResult.data?.created_by ?? DEFAULT_AUTHOR_ID;
  const pendingItems = (captureRow.extracted_items ?? []).filter((item) => item.status === "pending");
  const taskItems = pendingItems.filter((item) => item.item_type === "task" || item.item_type === "appointment");

  const tasks = taskItems.map((item) => ({
    id: makeId("task"),
    care_circle_id: careCircleId,
    title: item.title,
    category: item.category ?? "admin",
    assignee_id: item.assigned_to_id,
    due_date: normalizeDueDate(item.due_at ?? undefined),
    status: item.assigned_to_id ? "claimed" : "unclaimed",
    priority: item.priority ?? "medium",
    linked_record_id: documentId,
    linked_timeline_id: timelineId,
    notes: item.summary,
    created_at: now,
    updated_at: now
  }));

  const document = {
    id: documentId,
    care_circle_id: careCircleId,
    document_type: result.document_type || "Care document",
    title: result.document_type || capture.original_file_name || "Care document",
    summary: result.plain_english_summary,
    uploaded_by_id: authorId,
    uploaded_at: now,
    storage_path: capture.original_file_path,
    important_dates: result.important_dates ?? [],
    institutions: result.people_or_institutions ?? [],
    care_items: result.medications_or_care_items ?? [],
    extraction_json: result
  };

  const timeline = {
    id: timelineId,
    care_circle_id: careCircleId,
    type: "document",
    title: `${document.document_type} saved from ${capture.platform}`,
    description: result.family_update_message || result.plain_english_summary,
    author_id: authorId,
    timestamp: now,
    linked_task_ids: tasks.map((task) => task.id),
    linked_record_id: documentId,
    created_at: now
  };

  const documentResult = await supabase.from("documents").upsert(document);
  if (documentResult.error) throw documentResult.error;

  if (tasks.length > 0) {
    const tasksResult = await supabase.from("tasks").upsert(tasks.map(dropUndefined));
    if (tasksResult.error) throw tasksResult.error;
  }

  const timelineResult = await supabase.from("timeline_items").upsert(timeline);
  if (timelineResult.error) throw timelineResult.error;

  const [itemsResult, captureResult] = await Promise.all([
    supabase.from("extracted_items").update({ status: "approved", updated_at: now }).eq("capture_event_id", captureId),
    supabase.from("capture_events").update({ status: "saved", updated_at: now }).eq("id", captureId)
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (captureResult.error) throw captureResult.error;

  return { documentId, taskIds: tasks.map((task) => task.id), timelineId };
}

export async function updateExtractedItem(
  itemId: string,
  patch: {
    title?: string;
    summary?: string;
    assignedToId?: string | null;
    dueAt?: string | null;
    priority?: string;
    category?: string;
    status?: "pending" | "approved" | "deleted";
  }
) {
  const supabase = createSupabaseAdmin();
  if (!supabase) throw new Error("Supabase server environment is not configured.");

  const { error } = await supabase
    .from("extracted_items")
    .update(
      dropUndefined({
        title: patch.title,
        summary: patch.summary,
        assigned_to_id: patch.assignedToId,
        due_at: patch.dueAt,
        priority: patch.priority ? asTaskPriority(patch.priority) : undefined,
        category: patch.category ? asTaskCategory(patch.category) : undefined,
        status: patch.status,
        updated_at: new Date().toISOString()
      })
    )
    .eq("id", itemId);

  if (error) throw error;

  if (patch.assignedToId !== undefined) {
    try {
      await recordReassignment(supabase, itemId, patch.assignedToId);
    } catch {
      // Telemetry is best-effort.
    }
  }
}

export { senderNameFromTelegramUser };
