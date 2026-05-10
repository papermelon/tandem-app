"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { answerQuery } from "@/lib/query";
import { loadState, saveState } from "@/lib/idb";
import { defaultState } from "@/lib/sample-data";
import {
  DraftType,
  GroundTruthDecisionRecord,
  GroundTruthVersion,
  HandoverSession,
  InAppNotification,
  IngestionDraft,
  Member,
  QueryAnswer,
  SectionKey,
  TandemState,
  Task,
} from "@/lib/types";
import { createId, createToken, formatDate } from "@/lib/utils";

type ComposerMode = "note" | "task" | "ground-truth" | "draft";

type TimelineEvent = {
  id: string;
  time: string;
  kind: string;
  title: string;
  assignedTo: string;
  details: string;
  attachments: string[];
};

const sectionOrder: SectionKey[] = [
  "meds",
  "mobility",
  "mood",
  "diet",
  "appointments",
  "emergency",
];

const checklistTemplate = ["Medication", "Mobility", "Mood", "Where supplies are"];

function getMember(state: TandemState, memberId: string) {
  return state.members.find((member) => member.id === memberId);
}

function getLatestGroundTruth(state: TandemState) {
  return state.groundTruthVersions[0];
}

function toDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    margin: 1,
    color: {
      dark: "#153b44",
      light: "#fbf7f1",
    },
  });
}

function reconcileNotifications(state: TandemState): TandemState {
  const nextNotifications = [...state.notifications];
  const now = new Date();
  const activeMemberId = state.activeMemberId;

  const exists = (type: InAppNotification["type"], relatedId?: string) =>
    nextNotifications.some(
      (notification) =>
        notification.type === type && notification.payload.relatedId === relatedId
    );

  for (const task of state.tasks) {
    if (task.assignedTo !== activeMemberId) {
      continue;
    }

    if (!exists("task_assigned", task.taskId)) {
      nextNotifications.unshift({
        notificationId: createId("notif"),
        tanId: state.tandom.tanId,
        createdAt: task.createdAt,
        type: "task_assigned",
        payload: {
          title: "Task assigned",
          body: `You were assigned "${task.title}".`,
          relatedId: task.taskId,
        },
        actorId: task.createdBy,
      });
    }

    const due = new Date(task.dueAt);
    if (task.status !== "done" && due <= now && !exists("task_overdue", task.taskId)) {
      nextNotifications.unshift({
        notificationId: createId("notif"),
        tanId: state.tandom.tanId,
        createdAt: now.toISOString(),
        type: "task_overdue",
        payload: {
          title: "Task overdue",
          body: `"${task.title}" needs attention now.`,
          relatedId: task.taskId,
        },
        actorId: task.assignedTo,
      });
    }
  }

  for (const handover of state.handoverSessions) {
    if (!handover.completedAt && !exists("handover_pending", handover.sessionId)) {
      nextNotifications.unshift({
        notificationId: createId("notif"),
        tanId: state.tandom.tanId,
        createdAt: handover.createdAt,
        type: "handover_pending",
        payload: {
          title: "Handover pending",
          body: "A Trust Bridge handover is waiting for checklist completion.",
          relatedId: handover.sessionId,
        },
        actorId: handover.createdBy,
      });
    }
  }

  return {
    ...state,
    notifications: nextNotifications.slice(0, 30),
  };
}

function buildHeuristicDraft(
  tanId: string,
  type: DraftType,
  rawAssetRef: string,
  input: string
): IngestionDraft {
  const extractedFields: IngestionDraft["extractedFields"] = [];
  const lower = input.toLowerCase();

  if (lower.includes("mg") || lower.includes("med")) {
    extractedFields.push({
      field: "meds",
      proposedValue: input,
      verified: false,
    });
  }
  if (lower.includes("appointment") || lower.includes("clinic") || lower.includes("follow")) {
    extractedFields.push({
      field: "appointments",
      proposedValue: input,
      verified: false,
    });
  }
  if (lower.includes("walker") || lower.includes("transfer") || lower.includes("stairs")) {
    extractedFields.push({
      field: "mobility",
      proposedValue: input,
      verified: false,
    });
  }
  if (!extractedFields.length) {
    extractedFields.push({
      field: "mood",
      proposedValue: input,
      verified: false,
    });
  }

  return {
    draftId: createId("draft"),
    tanId,
    type,
    rawAssetRef,
    createdAt: new Date().toISOString(),
    extractedFields,
    verificationState: "pending",
  };
}

function getPriorityItems(state: TandemState, activeMemberId: string) {
  const now = new Date();
  const tasks = state.tasks.filter(
    (task) => task.assignedTo === activeMemberId && task.status !== "done"
  );
  const overdue = tasks.filter((task) => new Date(task.dueAt) <= now);
  const pendingHandover = state.handoverSessions.find((session) => !session.completedAt);

  return {
    tasks,
    overdue,
    pendingHandover,
  };
}

function getTimelineItems(state: TandemState): TimelineEvent[] {
  const memberName = (memberId: string) =>
    state.members.find((member) => member.id === memberId)?.displayName ?? "Care team";

  const items: TimelineEvent[] = [
    ...state.diaryEntries.map((entry) => ({
      id: entry.entryId,
      time: entry.createdAt,
      kind: "Note",
      title: entry.tags.length ? `${entry.tags[0]} update` : "Care note added",
      assignedTo: memberName(entry.createdBy),
      details: entry.text,
      attachments: entry.tags.map((tag) => `Tag: ${tag}`),
    })),
    ...state.groundTruthVersions.map((version) => ({
      id: version.versionId,
      time: version.createdAt,
      kind: "Ground Truth",
      title: "Ground Truth updated",
      assignedTo: memberName(version.createdBy),
      details: version.diffSummary,
      attachments: version.decisionRefs.map((decisionId) => `Decision reference: ${decisionId}`),
    })),
    ...state.decisionRecords.map((decision) => ({
      id: decision.decisionId,
      time: decision.createdAt,
      kind: "Decision",
      title: `${decision.field} conflict resolved`,
      assignedTo: memberName(decision.createdBy),
      details: `${decision.chosen}. ${decision.rationale}`,
      attachments: decision.evidenceRefs.map((reference) => reference.label),
    })),
    ...state.handoverSessions
      .filter((session) => session.receipt)
      .map((session) => ({
        id: session.sessionId,
        time: session.completedAt ?? session.createdAt,
        kind: "Handover",
        title: "Trust Bridge handover completed",
        assignedTo: memberName(session.scannedBy ?? session.createdBy),
        details: session.receipt?.notes ?? "Handover completed.",
        attachments: session.receipt?.reviewedSections ?? [],
      })),
    ...state.ingestionDrafts.map((draft) => ({
      id: draft.draftId,
      time: draft.createdAt,
      kind: draft.type === "photo" ? "Photo draft" : "Voice draft",
      title: draft.rawAssetRef,
      assignedTo: memberName(state.activeMemberId),
      details: `${draft.verificationState} with ${draft.extractedFields.length} extracted field(s).`,
      attachments: draft.extractedFields.map(
        (field) => `${field.field}: ${field.proposedValue}`
      ),
    })),
    ...state.tasks.map((task) => ({
      id: task.taskId,
      time: task.createdAt,
      kind: "Task",
      title: task.title,
      assignedTo: memberName(task.assignedTo),
      details: `${task.status} · due ${formatDate(task.dueAt)}`,
      attachments: [`Created by ${memberName(task.createdBy)}`],
    })),
  ];

  return items.sort((left, right) => +new Date(right.time) - +new Date(left.time));
}

export function TandemApp() {
  const [state, setState] = useState<TandemState>(defaultState);
  const [isReady, setIsReady] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("note");
  const [inviteQr, setInviteQr] = useState("");
  const [handoverQr, setHandoverQr] = useState("");
  const [scanToken, setScanToken] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinRole, setJoinRole] = useState<Member["role"]>("family");
  const [joinLanguage, setJoinLanguage] = useState<Member["language"]>("English");
  const [groundTruthInput, setGroundTruthInput] = useState({
    field: "meds" as SectionKey,
    candidate: "",
    rationale: "",
  });
  const [taskInput, setTaskInput] = useState({ title: "", dueAt: "", assignedTo: "" });
  const [diaryText, setDiaryText] = useState("");
  const [draftInput, setDraftInput] = useState({
    type: "photo" as DraftType,
    rawAssetRef: "",
    content: "",
  });
  const [queryText, setQueryText] = useState("");
  const [queryAnswer, setQueryAnswer] = useState<QueryAnswer | null>(null);

  useEffect(() => {
    let ignore = false;

    loadState().then((loaded) => {
      if (!ignore) {
        const reconciled = reconcileNotifications(loaded);
        setState(reconciled);
        setIsReady(true);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    void saveState(state);
  }, [isReady, state]);

  useEffect(() => {
    void toDataUrl(state.tandom.inviteToken).then(setInviteQr);
  }, [state.tandom.inviteToken]);

  useEffect(() => {
    const pending = state.handoverSessions.find((session) => !session.completedAt);
    if (!pending) {
      setHandoverQr("");
      return;
    }
    void toDataUrl(pending.scanToken).then(setHandoverQr);
  }, [state.handoverSessions]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  const activeMember = getMember(state, state.activeMemberId) ?? state.members[0];
  const latestGroundTruth = getLatestGroundTruth(state);
  const priorities = useMemo(
    () => getPriorityItems(state, state.activeMemberId),
    [state]
  );
  const unreadNotifications = state.notifications.filter((item) => !item.readAt);
  const recentDecision = state.decisionRecords[0];
  const latestReceipt = state.handoverSessions.find((session) => session.receipt);
  const historyPreview = state.diaryEntries[0];
  const timelineItems = useMemo(() => getTimelineItems(state), [state]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const selectedTimelineEvent =
    timelineItems.find((item) => item.id === selectedTimelineId) ?? timelineItems[0] ?? null;

  useEffect(() => {
    if (!selectedTimelineId && timelineItems[0]) {
      setSelectedTimelineId(timelineItems[0].id);
    }
  }, [selectedTimelineId, timelineItems]);

  function commitState(updater: (current: TandemState) => TandemState) {
    setState((current) => reconcileNotifications(updater(current)));
  }

  function switchActiveMember(memberId: string) {
    commitState((current) => ({ ...current, activeMemberId: memberId }));
  }

  function markNotificationRead(notificationId: string) {
    commitState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.notificationId === notificationId
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      ),
    }));
  }

  function handleJoinTandom() {
    if (!scanToken.trim() || !joinName.trim()) {
      return;
    }

    commitState((current) => {
      const newMember: Member = {
        id: createId("member"),
        tanId: current.tandom.tanId,
        displayName: joinName.trim(),
        role: joinRole,
        language: joinLanguage,
      };

      return {
        ...current,
        members: [...current.members, newMember],
        tandom: {
          ...current.tandom,
          memberIds: [...current.tandom.memberIds, newMember.id],
        },
      };
    });

    setJoinName("");
    setScanToken("");
  }

  function addGroundTruthDecision() {
    if (!latestGroundTruth || !groundTruthInput.candidate.trim() || !groundTruthInput.rationale.trim()) {
      return;
    }

    commitState((current) => {
      const latest = current.groundTruthVersions[0];
      const decisionId = createId("decision");
      const versionId = createId("gt");
      const previousValue = latest.sections[groundTruthInput.field].value;
      const nextValue = groundTruthInput.candidate.trim();

      const decision: GroundTruthDecisionRecord = {
        decisionId,
        tanId: current.tandom.tanId,
        createdAt: new Date().toISOString(),
        createdBy: current.activeMemberId,
        conflictType: "ground_truth_conflict",
        field: groundTruthInput.field,
        candidates: [previousValue, nextValue],
        chosen: nextValue,
        rationale: groundTruthInput.rationale.trim(),
        evidenceRefs: [
          {
            type: "version",
            id: latest.versionId,
            label: `Prior Ground Truth ${latest.versionId}`,
          },
        ],
        impactedVersionIds: [versionId],
      };

      const nextVersion: GroundTruthVersion = {
        ...latest,
        versionId,
        createdAt: new Date().toISOString(),
        createdBy: current.activeMemberId,
        sections: {
          ...latest.sections,
          [groundTruthInput.field]: {
            ...latest.sections[groundTruthInput.field],
            value: nextValue,
            lastConfirmedAt: new Date().toISOString(),
          },
        },
        decisionRefs: [decisionId, ...latest.decisionRefs],
        diffSummary: `${groundTruthInput.field} updated from "${previousValue}" to "${nextValue}".`,
      };

      const notification: InAppNotification = {
        notificationId: createId("notif"),
        tanId: current.tandom.tanId,
        createdAt: nextVersion.createdAt,
        type: "ground_truth_updated",
        payload: {
          title: "Ground Truth updated",
          body: nextVersion.diffSummary,
          relatedId: nextVersion.versionId,
        },
        actorId: current.activeMemberId,
      };

      return {
        ...current,
        decisionRecords: [decision, ...current.decisionRecords],
        groundTruthVersions: [nextVersion, ...current.groundTruthVersions],
        notifications: [notification, ...current.notifications],
      };
    });

    setGroundTruthInput({ field: "meds", candidate: "", rationale: "" });
    setComposerMode("note");
  }

  function addTask() {
    if (!taskInput.title.trim() || !taskInput.dueAt || !taskInput.assignedTo) {
      return;
    }

    commitState((current) => ({
      ...current,
      tasks: [
        {
          taskId: createId("task"),
          tanId: current.tandom.tanId,
          title: taskInput.title.trim(),
          dueAt: new Date(taskInput.dueAt).toISOString(),
          assignedTo: taskInput.assignedTo,
          status: "open",
          createdBy: current.activeMemberId,
          createdAt: new Date().toISOString(),
        },
        ...current.tasks,
      ],
    }));

    setTaskInput({ title: "", dueAt: "", assignedTo: "" });
    setComposerMode("note");
  }

  function cycleTaskStatus(taskId: string) {
    const nextStatus = {
      open: "claimed",
      claimed: "done",
      done: "open",
    } as const;

    commitState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.taskId === taskId ? { ...task, status: nextStatus[task.status] } : task
      ),
    }));
  }

  function addDiaryEntry() {
    if (!diaryText.trim()) {
      return;
    }

    commitState((current) => ({
      ...current,
      diaryEntries: [
        {
          entryId: createId("diary"),
          tanId: current.tandom.tanId,
          text: diaryText.trim(),
          tags: diaryText
            .split(" ")
            .filter((word) => word.startsWith("#"))
            .map((tag) => tag.replace("#", "")),
          createdBy: current.activeMemberId,
          createdAt: new Date().toISOString(),
        },
        ...current.diaryEntries,
      ],
    }));

    setDiaryText("");
  }

  function createDraft() {
    if (!draftInput.rawAssetRef.trim() || !draftInput.content.trim()) {
      return;
    }

    const draft = buildHeuristicDraft(
      state.tandom.tanId,
      draftInput.type,
      draftInput.rawAssetRef.trim(),
      draftInput.content.trim()
    );

    commitState((current) => ({
      ...current,
      ingestionDrafts: [draft, ...current.ingestionDrafts],
    }));

    setDraftInput({ type: "photo", rawAssetRef: "", content: "" });
    setComposerMode("note");
  }

  function toggleDraftVerification(draftId: string, field: SectionKey) {
    commitState((current) => ({
      ...current,
      ingestionDrafts: current.ingestionDrafts.map((draft) => {
        if (draft.draftId !== draftId) {
          return draft;
        }

        const extractedFields = draft.extractedFields.map((entry) =>
          entry.field === field ? { ...entry, verified: !entry.verified } : entry
        );

        return {
          ...draft,
          extractedFields,
          verificationState: extractedFields.every((entry) => entry.verified)
            ? "ready"
            : "pending",
        };
      }),
    }));
  }

  function commitDraft(draftId: string) {
    commitState((current) => {
      const draft = current.ingestionDrafts.find((item) => item.draftId === draftId);
      const latest = current.groundTruthVersions[0];
      if (!draft || draft.verificationState !== "ready" || !latest) {
        return current;
      }

      const updatedSections = { ...latest.sections };
      for (const field of draft.extractedFields) {
        updatedSections[field.field] = {
          ...updatedSections[field.field],
          value: field.proposedValue,
          lastConfirmedAt: new Date().toISOString(),
        };
      }

      const versionId = createId("gt");
      const version: GroundTruthVersion = {
        ...latest,
        versionId,
        createdAt: new Date().toISOString(),
        createdBy: current.activeMemberId,
        sections: updatedSections,
        diffSummary: `Committed verified ${draft.type} draft ${draft.draftId} into Ground Truth.`,
      };

      return {
        ...current,
        groundTruthVersions: [version, ...current.groundTruthVersions],
        ingestionDrafts: current.ingestionDrafts.map((item) =>
          item.draftId === draftId ? { ...item, verificationState: "committed" } : item
        ),
      };
    });
  }

  function startHandover() {
    commitState((current) => {
      const session: HandoverSession = {
        sessionId: createId("handover"),
        tanId: current.tandom.tanId,
        createdBy: current.activeMemberId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        scanToken: createToken(`HANDOVER|${current.tandom.tanId}`),
        checklistState: Object.fromEntries(
          checklistTemplate.map((item) => [item, false])
        ) as Record<string, boolean>,
      };

      const notification: InAppNotification = {
        notificationId: createId("notif"),
        tanId: current.tandom.tanId,
        createdAt: session.createdAt,
        type: "handover_started",
        payload: {
          title: "Handover started",
          body: `${activeMember?.displayName ?? "A caregiver"} started a Trust Bridge handover.`,
          relatedId: session.sessionId,
        },
        actorId: current.activeMemberId,
      };

      return {
        ...current,
        handoverSessions: [session, ...current.handoverSessions],
        notifications: [notification, ...current.notifications],
      };
    });
  }

  function claimHandover() {
    const trimmedToken = scanToken.trim();
    if (!trimmedToken) {
      return;
    }

    commitState((current) => ({
      ...current,
      handoverSessions: current.handoverSessions.map((session) =>
        !session.completedAt &&
        !session.scannedBy &&
        (session.scanToken === trimmedToken || session.scanToken.includes(trimmedToken))
          ? { ...session, scannedBy: current.activeMemberId }
          : session
      ),
    }));
  }

  function toggleChecklist(sessionId: string, item: string) {
    commitState((current) => ({
      ...current,
      handoverSessions: current.handoverSessions.map((session) =>
        session.sessionId === sessionId
          ? {
              ...session,
              checklistState: {
                ...session.checklistState,
                [item]: !session.checklistState[item],
              },
            }
          : session
      ),
    }));
  }

  function completeHandover(sessionId: string) {
    commitState((current) => ({
      ...current,
      handoverSessions: current.handoverSessions.map((session) =>
        session.sessionId === sessionId
          ? {
              ...session,
              completedAt: new Date().toISOString(),
              receipt: {
                reviewedSections: Object.entries(session.checklistState)
                  .filter(([, checked]) => checked)
                  .map(([item]) => item),
                notes: "Checklist reviewed in person and relevant decisions were opened.",
                decisionRefs: current.groundTruthVersions[0]?.decisionRefs ?? [],
              },
            }
          : session
      ),
    }));
  }

  function runQuery() {
    setQueryAnswer(answerQuery(state, queryText));
  }

  function renderTask(task: Task) {
    return (
      <article key={task.taskId} className="list-card task-row">
        <div className="task-main">
          <strong>{task.title}</strong>
          <small className="task-meta">
            {getMember(state, task.assignedTo)?.displayName} · {formatDate(task.dueAt)}
          </small>
        </div>
        <button className="ghost-button row-action" onClick={() => cycleTaskStatus(task.taskId)}>
          {task.status === "open"
            ? "Claim"
            : task.status === "claimed"
              ? "Done"
              : "Reopen"}
        </button>
      </article>
    );
  }

  const pendingHandover = priorities.pendingHandover;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image
            src="/tandem-logo.jpg"
            alt="Tandem - Care Moves Better in Tandem"
            width={213}
            height={120}
            className="brand-logo"
            priority
          />
        </div>
        <div className="topbar-actions">
          <span className="sync-status">Synced just now</span>
          <label className="caregiver-select">
            <select
              value={state.activeMemberId}
              onChange={(event) => switchActiveMember(event.target.value)}
            >
              {state.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} ({member.role})
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h2>Good morning, {activeMember?.displayName ?? "caregiver"}.</h2>
          <p className="hero-title">Here&apos;s today&apos;s care shift.</p>
          <p className="lede">Everything you need to know, in one calm place.</p>
        </div>

        <div className="stats">
          <article className="stat-card">
            <div className="stat-icon">✓</div>
            <div>
              <strong>{state.tasks.filter((task) => task.status === "done").length}</strong>
              <span>Tasks done</span>
              <small>of {state.tasks.length}</small>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-icon soft">◴</div>
            <div>
              <strong>1</strong>
              <span>Appointment</span>
              <small>today</small>
            </div>
          </article>
          <article className="stat-card">
            <div className="stat-icon warm">◌</div>
            <div>
              <strong>{state.members.length}</strong>
              <span>Care team</span>
              <small>connected</small>
            </div>
          </article>
        </div>
      </section>

      <section className="workflow">
        <section className="surface">
          <div className="section-head">
            <h3>What changed</h3>
          </div>

          <div className="row-list">
            <article className="update-row">
              <div className="row-icon green">⌁</div>
              <div className="row-copy">
                <strong>Medication</strong>
                <p>{latestGroundTruth?.sections.meds.value}</p>
              </div>
              <small className="row-meta">
                {latestGroundTruth ? formatDate(latestGroundTruth.createdAt) : ""}
              </small>
            </article>
            <article className="update-row">
              <div className="row-icon blue">◫</div>
              <div className="row-copy">
                <strong>Upcoming appointment</strong>
                <p>{latestGroundTruth?.sections.appointments.value}</p>
              </div>
              <small className="row-meta">Today</small>
            </article>
            <article className="update-row">
              <div className="row-icon amber">!</div>
              <div className="row-copy">
                <strong>Latest change</strong>
                <p>{latestGroundTruth?.diffSummary}</p>
              </div>
              <small className="row-meta">
                {latestGroundTruth ? formatDate(latestGroundTruth.createdAt) : ""}
              </small>
            </article>
          </div>
        </section>

        <section className="surface">
          <div className="section-head">
            <h3>What needs attention now</h3>
          </div>

          <div className="row-list">
            {priorities.tasks.length ? priorities.tasks.map(renderTask) : (
              <div className="empty-state">No active tasks for this caregiver right now.</div>
            )}
          </div>

          {unreadNotifications[0] ? (
            <article className="notice-banner">
              <div className="row-icon pale">◔</div>
              <div className="row-copy">
                <strong>{unreadNotifications[0].payload.title}</strong>
                <p>{unreadNotifications[0].payload.body}</p>
              </div>
              <button
                className="ghost-button row-action"
                onClick={() => markNotificationRead(unreadNotifications[0].notificationId)}
              >
                Read
              </button>
            </article>
          ) : null}
        </section>

        <section className="surface">
          <div className="composer-tabs">
            {[
              ["note", "Add note"],
              ["task", "Add task"],
              ["ground-truth", "Resolve conflict"],
              ["draft", "Add photo or voice"],
            ].map(([id, label]) => (
              <button
                key={id}
                className={composerMode === id ? "chip active" : "chip"}
                onClick={() => setComposerMode(id as ComposerMode)}
              >
                {label}
              </button>
            ))}
          </div>

          {composerMode === "note" ? (
            <div className="composer">
              <label className="field">
                <span>Add a note for your care team</span>
                <textarea
                  value={diaryText}
                  onChange={(event) => setDiaryText(event.target.value)}
                  placeholder="Write what changed during care. Add #tags if useful."
                />
              </label>
              <button className="primary-button" onClick={addDiaryEntry}>
                Save note
              </button>
            </div>
          ) : null}

          {composerMode === "task" ? (
            <div className="composer split">
              <label className="field">
                <span>Task</span>
                <input
                  value={taskInput.title}
                  onChange={(event) =>
                    setTaskInput((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="e.g. Bring walker to clinic"
                />
              </label>
              <label className="field">
                <span>Due</span>
                <input
                  type="datetime-local"
                  value={taskInput.dueAt}
                  onChange={(event) =>
                    setTaskInput((current) => ({ ...current, dueAt: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Assign to</span>
                <select
                  value={taskInput.assignedTo}
                  onChange={(event) =>
                    setTaskInput((current) => ({ ...current, assignedTo: event.target.value }))
                  }
                >
                  <option value="">Choose caregiver</option>
                  {state.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-button" onClick={addTask}>
                Create task
              </button>
            </div>
          ) : null}

          {composerMode === "ground-truth" ? (
            <div className="composer">
              <div className="reference-card">
                <p className="label">Current Ground Truth</p>
                <strong>{latestGroundTruth?.sections[groundTruthInput.field].value}</strong>
                {recentDecision ? <small>{recentDecision.rationale}</small> : null}
              </div>
              <div className="split">
                <label className="field">
                  <span>Field</span>
                  <select
                    value={groundTruthInput.field}
                    onChange={(event) =>
                      setGroundTruthInput((current) => ({
                        ...current,
                        field: event.target.value as SectionKey,
                      }))
                    }
                  >
                    {sectionOrder.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Chosen value</span>
                  <input
                    value={groundTruthInput.candidate}
                    onChange={(event) =>
                      setGroundTruthInput((current) => ({
                        ...current,
                        candidate: event.target.value,
                      }))
                    }
                    placeholder="What should become the new record?"
                  />
                </label>
              </div>
              <label className="field">
                <span>Why this should win</span>
                <textarea
                  value={groundTruthInput.rationale}
                  onChange={(event) =>
                    setGroundTruthInput((current) => ({
                      ...current,
                      rationale: event.target.value,
                    }))
                  }
                  placeholder="Explain the decision so future caregivers can trust it."
                />
              </label>
              <button className="primary-button" onClick={addGroundTruthDecision}>
                Save decision and update Ground Truth
              </button>
            </div>
          ) : null}

          {composerMode === "draft" ? (
            <div className="composer">
              <div className="split">
                <label className="field">
                  <span>Type</span>
                  <select
                    value={draftInput.type}
                    onChange={(event) =>
                      setDraftInput((current) => ({
                        ...current,
                        type: event.target.value as DraftType,
                      }))
                    }
                  >
                    <option value="photo">Photo</option>
                    <option value="voice">Voice</option>
                  </select>
                </label>
                <label className="field">
                  <span>Asset label</span>
                  <input
                    value={draftInput.rawAssetRef}
                    onChange={(event) =>
                      setDraftInput((current) => ({
                        ...current,
                        rawAssetRef: event.target.value,
                      }))
                    }
                    placeholder="e.g. discharge-note.jpg"
                  />
                </label>
              </div>
              <label className="field">
                <span>Pasted transcript or OCR text</span>
                <textarea
                  value={draftInput.content}
                  onChange={(event) =>
                    setDraftInput((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder="Paste the text to turn into a verification draft."
                />
              </label>
              <button className="primary-button" onClick={createDraft}>
                Create verification draft
              </button>
            </div>
          ) : null}
        </section>

        <section className="surface">
          <div className="section-head">
            <h3>Trust Bridge handover</h3>
          </div>

          {!pendingHandover ? (
            <button className="primary-button" onClick={startHandover}>
              Start Trust Bridge handover
            </button>
          ) : (
            <div className="handover-box">
              <div className="handover-header">
                <div>
                  <strong>Active handover</strong>
                  <small>Expires {formatDate(pendingHandover.expiresAt)}</small>
                </div>
                {handoverQr ? (
                  <Image
                    className="qr"
                    src={handoverQr}
                    alt="Handover QR"
                    width={140}
                    height={140}
                    unoptimized
                  />
                ) : null}
              </div>

              <code>{pendingHandover.scanToken}</code>

              <div className="split">
                <label className="field">
                  <span>Incoming caregiver token</span>
                  <input
                    value={scanToken}
                    onChange={(event) => setScanToken(event.target.value)}
                    placeholder="Paste the scanned token"
                  />
                </label>
                <button className="ghost-button align-end mobile-full" onClick={claimHandover}>
                  Claim handover
                </button>
              </div>

              <div className="checklist">
                {Object.entries(pendingHandover.checklistState).map(([item, checked]) => (
                  <label key={item} className={checked ? "check checked" : "check"}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChecklist(pendingHandover.sessionId, item)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>

              <p className="support-copy">
                Decision references stay available during handover:{" "}
                {(latestGroundTruth?.decisionRefs ?? []).join(", ") || "None yet"}
              </p>

              <button
                className="primary-button"
                onClick={() => completeHandover(pendingHandover.sessionId)}
              >
                Complete handover
              </button>
            </div>
          )}

          {latestReceipt?.receipt ? (
            <div className="receipt-card">
              <div>
                <p className="label">Handover receipt</p>
                <strong>Last handover sent</strong>
                <small>{latestReceipt.completedAt ? formatDate(latestReceipt.completedAt) : ""}</small>
              </div>
              <div className="receipt-meta">
                <p>{latestReceipt.receipt.notes}</p>
                <small>
                  Reviewed {latestReceipt.receipt.reviewedSections.join(", ")} · Decisions{" "}
                  {latestReceipt.receipt.decisionRefs.join(", ") || "None"}
                </small>
              </div>
            </div>
          ) : null}
        </section>

        <section className="surface">
          <div className="section-head">
            <h3>Ask Tandem</h3>
          </div>

          <div className="composer split">
            <label className="field">
              <span>Ask anything about this record</span>
              <input
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="e.g. What is the current amlodipine dosage?"
              />
            </label>
            <button className="primary-button align-end" onClick={runQuery}>
              Search records
            </button>
          </div>

          {queryAnswer ? (
            <div className="ask-result">
              <strong>{queryAnswer.answer}</strong>
              {queryAnswer.citations.length ? (
                <div className="citation-list">
                  {queryAnswer.citations.map((citation) => (
                    <small key={`${citation.type}-${citation.recordId}`}>
                      {citation.label}
                    </small>
                  ))}
                </div>
              ) : null}
              {queryAnswer.followUp ? <small>{queryAnswer.followUp}</small> : null}
            </div>
          ) : null}
        </section>

        <section className="surface">
          <div className="section-head">
            <h3>Care history</h3>
          </div>
          <div className="care-timeline-layout">
            <div className="timeline-scroll" aria-label="Care history timeline">
              <div className="timeline-rail" />
              {timelineItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    item.id === selectedTimelineEvent?.id
                      ? `timeline-event ${index % 2 === 0 ? "left" : "right"} active`
                      : `timeline-event ${index % 2 === 0 ? "left" : "right"}`
                  }
                  onClick={() => setSelectedTimelineId(item.id)}
                >
                  <div className="timeline-dot" />
                  <article className="timeline-card">
                    <div className="timeline-card-main">
                      <strong>{item.title}</strong>
                      <span>{item.assignedTo}</span>
                    </div>
                    <small className="timeline-date">{formatDate(item.time)}</small>
                  </article>
                </button>
              ))}
            </div>

            {selectedTimelineEvent ? (
              <aside className="timeline-detail">
                <div className="timeline-detail-head">
                  <div>
                    <p className="label">{selectedTimelineEvent.kind}</p>
                    <strong>{selectedTimelineEvent.title}</strong>
                  </div>
                  <small>{formatDate(selectedTimelineEvent.time)}</small>
                </div>
                <p className="timeline-detail-assignee">
                  Assigned to {selectedTimelineEvent.assignedTo}
                </p>
                <p className="timeline-detail-copy">{selectedTimelineEvent.details}</p>
                <div className="timeline-attachments">
                  <p className="label">Attachments</p>
                  {selectedTimelineEvent.attachments.length ? (
                    selectedTimelineEvent.attachments.map((attachment) => (
                      <button key={attachment} type="button" className="attachment-pill">
                        {attachment}
                      </button>
                    ))
                  ) : (
                    <small>No attachments for this event.</small>
                  )}
                </div>
              </aside>
            ) : null}
          </div>
        </section>
      </section>

      <section className="history">
        <details>
          <summary>History</summary>
          <div className="history-grid">
            <div className="history-block">
              <h3>Decision Records</h3>
              {state.decisionRecords.map((decision) => (
                <article key={decision.decisionId} className="list-card static-card">
                  <div>
                    <strong>{decision.chosen}</strong>
                    <small className="row-meta">
                      {decision.field} · {formatDate(decision.createdAt)}
                    </small>
                  </div>
                  <p>{decision.rationale}</p>
                </article>
              ))}
            </div>

            <div className="history-block">
              <h3>Ground Truth versions</h3>
              {state.groundTruthVersions.map((version) => (
                <article key={version.versionId} className="list-card static-card">
                  <div>
                    <strong>{version.versionId}</strong>
                    <small className="row-meta">{formatDate(version.createdAt)}</small>
                  </div>
                  <p>{version.diffSummary}</p>
                </article>
              ))}
            </div>

            <div className="history-block">
              <h3>Recent notes</h3>
              {state.diaryEntries.map((entry) => (
                <article key={entry.entryId} className="list-card static-card">
                  <div>
                    <strong>{getMember(state, entry.createdBy)?.displayName}</strong>
                    <small className="row-meta">{formatDate(entry.createdAt)}</small>
                  </div>
                  <p>{entry.text}</p>
                </article>
              ))}
            </div>

            <div className="history-block">
              <h3>Verification drafts</h3>
              {state.ingestionDrafts.map((draft) => (
                <article key={draft.draftId} className="list-card static-card">
                  <div>
                    <strong>{draft.rawAssetRef}</strong>
                    <small className="row-meta">
                      {draft.type} · {draft.verificationState}
                    </small>
                  </div>
                  <div className="draft-fields">
                    {draft.extractedFields.map((field) => (
                      <label key={field.field} className={field.verified ? "check checked" : "check"}>
                        <input
                          type="checkbox"
                          checked={field.verified}
                          onChange={() => toggleDraftVerification(draft.draftId, field.field)}
                        />
                        <span>
                          {field.field}: {field.proposedValue}
                        </span>
                      </label>
                    ))}
                  </div>
                  <button
                    className="ghost-button"
                    disabled={draft.verificationState !== "ready"}
                    onClick={() => commitDraft(draft.draftId)}
                  >
                    Commit to Ground Truth
                  </button>
                </article>
              ))}
            </div>
            <div className="history-block">
              <h3>Invite and manage Tandom</h3>
              {historyPreview ? (
                <article className="history-preview">
                  <strong>Latest note</strong>
                  <p>{historyPreview.text}</p>
                </article>
              ) : null}
            </div>

            <div className="history-block">
              <h3>Invite another caregiver</h3>
              {inviteQr ? (
                <Image
                  className="qr"
                  src={inviteQr}
                  alt="Tandom invite QR"
                  width={160}
                  height={160}
                  unoptimized
                />
              ) : null}
              <code>{state.tandom.inviteToken}</code>
            </div>

            <div className="history-block">
              <h3>Join this Tandom</h3>
              <div className="stacked-fields">
                <label className="field">
                  <span>Invite token</span>
                  <input
                    value={scanToken}
                    onChange={(event) => setScanToken(event.target.value)}
                    placeholder="Paste invite token"
                  />
                </label>
                <label className="field">
                  <span>Name</span>
                  <input
                    value={joinName}
                    onChange={(event) => setJoinName(event.target.value)}
                    placeholder="Caregiver name"
                  />
                </label>
                <label className="field">
                  <span>Role</span>
                  <select
                    value={joinRole}
                    onChange={(event) => setJoinRole(event.target.value as Member["role"])}
                  >
                    <option value="family">Family</option>
                    <option value="fdw">FDW</option>
                    <option value="primary">Primary</option>
                  </select>
                </label>
                <label className="field">
                  <span>Language</span>
                  <select
                    value={joinLanguage}
                    onChange={(event) =>
                      setJoinLanguage(event.target.value as Member["language"])
                    }
                  >
                    <option>English</option>
                    <option>Tagalog</option>
                    <option>Bahasa</option>
                    <option>Burmese</option>
                  </select>
                </label>
                <button className="primary-button" onClick={handleJoinTandom}>
                  Add caregiver
                </button>
              </div>
            </div>
          </div>
        </details>
      </section>

      {!isReady ? <div className="loading">Loading Tandem records...</div> : null}
    </main>
  );
}
