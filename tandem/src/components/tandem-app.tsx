"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
} from "@/lib/types";
import { createId, createToken, formatDate } from "@/lib/utils";

type Tab =
  | "overview"
  | "ground-truth"
  | "handover"
  | "coordination"
  | "ingestion"
  | "ask";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "ground-truth", label: "Ground Truth" },
  { id: "handover", label: "Trust Bridge" },
  { id: "coordination", label: "Care Coordination" },
  { id: "ingestion", label: "AI Ingestion" },
  { id: "ask", label: "Ask Tandem" },
];

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
      dark: "#0f4c5c",
      light: "#fefcf3",
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

export function TandemApp() {
  const [state, setState] = useState<TandemState>(defaultState);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [inviteQr, setInviteQr] = useState("");
  const [handoverQr, setHandoverQr] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinRole, setJoinRole] = useState<Member["role"]>("family");
  const [joinLanguage, setJoinLanguage] = useState<Member["language"]>("English");
  const [scanToken, setScanToken] = useState("");
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
  const unreadCount = state.notifications.filter((item) => !item.readAt).length;

  function commitState(updater: (current: TandemState) => TandemState) {
    setState((current) => reconcileNotifications(updater(current)));
  }

  function switchActiveMember(memberId: string) {
    commitState((current) => ({ ...current, activeMemberId: memberId }));
  }

  function handleJoinTandom() {
    const trimmedToken = scanToken.trim();
    if (!trimmedToken || !joinName.trim()) {
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

  function runQuery() {
    setQueryAnswer(answerQuery(state, queryText));
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

  const pendingHandover = state.handoverSessions.find((session) => !session.completedAt);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Tandem care operating system</p>
          <h1>Tandem keeps every handover, decision, and daily task in one shared Tandom.</h1>
          <p className="lede">
            Local-first, mobile-first, and grounded in the exact record that the family agreed on.
          </p>
        </div>
        <div className="hero-card">
          <span className="pill">TanID {state.tandom.tanId}</span>
          <strong>{state.tandom.name}</strong>
          <span>{state.members.length} caregivers in this Tandom</span>
          <label className="field">
            <span>Active caregiver</span>
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
      </section>

      <section className="topline">
        <div className="stat-card">
          <span>Latest Ground Truth</span>
          <strong>{latestGroundTruth?.versionId ?? "None"}</strong>
          <small>{latestGroundTruth ? formatDate(latestGroundTruth.createdAt) : "No record yet"}</small>
        </div>
        <div className="stat-card">
          <span>Decision Records</span>
          <strong>{state.decisionRecords.length}</strong>
          <small>Always linked wherever referenced</small>
        </div>
        <div className="stat-card">
          <span>Unread notifications</span>
          <strong>{unreadCount}</strong>
          <small>In-app only for this prototype</small>
        </div>
      </section>

      <section className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="workspace">
        <div className="panel main-panel">
          {activeTab === "overview" && (
            <div className="stack">
              <div className="card">
                <h2>Invite into the Tandom</h2>
                <p>Share this QR or token. No public signup, only caregiver-led joins.</p>
                {inviteQr ? (
                  <Image
                    className="qr"
                    src={inviteQr}
                    alt="Tandom invite QR"
                    width={220}
                    height={220}
                    unoptimized
                  />
                ) : null}
                <code>{state.tandom.inviteToken}</code>
              </div>

              <div className="card">
                <h2>Join using TanID invite</h2>
                <div className="grid two">
                  <label className="field">
                    <span>Invite token or scanned QR value</span>
                    <input
                      value={scanToken}
                      onChange={(event) => setScanToken(event.target.value)}
                      placeholder="Paste invite token"
                    />
                  </label>
                  <label className="field">
                    <span>Caregiver name</span>
                    <input
                      value={joinName}
                      onChange={(event) => setJoinName(event.target.value)}
                      placeholder="e.g. Mei"
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
                </div>
                <button className="action" onClick={handleJoinTandom}>
                  Add caregiver to Tandom
                </button>
              </div>

              <div className="card">
                <h2>Current Ground Truth snapshot</h2>
                <div className="grid two">
                  {latestGroundTruth
                    ? sectionOrder.map((field) => (
                        <article key={field} className="soft-card">
                          <span>{latestGroundTruth.sections[field].title}</span>
                          <strong>{latestGroundTruth.sections[field].value}</strong>
                          <small>
                            Confirmed {formatDate(latestGroundTruth.sections[field].lastConfirmedAt)}
                          </small>
                        </article>
                      ))
                    : null}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ground-truth" && latestGroundTruth && (
            <div className="stack">
              <div className="card">
                <h2>Versioned Ground Truth</h2>
                <p>{latestGroundTruth.diffSummary}</p>
                <div className="timeline">
                  {state.groundTruthVersions.map((version) => (
                    <article key={version.versionId} className="timeline-item">
                      <div>
                        <strong>{version.versionId}</strong>
                        <span>{formatDate(version.createdAt)}</span>
                      </div>
                      <p>{version.diffSummary}</p>
                      <small>Decision refs: {version.decisionRefs.join(", ") || "None"}</small>
                    </article>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2>Create a decision-backed update</h2>
                <div className="grid two">
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
                      placeholder="Enter the new ground truth"
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Rationale</span>
                  <textarea
                    value={groundTruthInput.rationale}
                    onChange={(event) =>
                      setGroundTruthInput((current) => ({
                        ...current,
                        rationale: event.target.value,
                      }))
                    }
                    placeholder="Why this choice overrides the competing record"
                  />
                </label>
                <button className="action" onClick={addGroundTruthDecision}>
                  Save decision and version
                </button>
              </div>

              <div className="card">
                <h2>Decision Records</h2>
                <div className="stack">
                  {state.decisionRecords.map((decision) => (
                    <article key={decision.decisionId} className="decision-card">
                      <div className="decision-head">
                        <strong>{decision.decisionId}</strong>
                        <span>{formatDate(decision.createdAt)}</span>
                      </div>
                      <p>
                        <strong>Conflict:</strong> {decision.conflictType} on {decision.field}
                      </p>
                      <p>
                        <strong>Candidates:</strong> {decision.candidates.join(" vs ")}
                      </p>
                      <p>
                        <strong>Chosen:</strong> {decision.chosen}
                      </p>
                      <p>
                        <strong>Why:</strong> {decision.rationale}
                      </p>
                      <p>
                        <strong>Evidence:</strong>{" "}
                        {decision.evidenceRefs.map((reference) => reference.label).join(", ")}
                      </p>
                      <p>
                        <strong>Referenced by versions:</strong>{" "}
                        {decision.impactedVersionIds.join(", ")}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "handover" && (
            <div className="stack">
              <div className="card">
                <h2>Start Trust Bridge handover</h2>
                <p>Create a short-lived QR to verify both caregivers are physically present.</p>
                <button className="action" onClick={startHandover}>
                  Start new handover
                </button>
              </div>

              {pendingHandover ? (
                <div className="card">
                  <h2>Active handover session</h2>
                  <p>Token expires {formatDate(pendingHandover.expiresAt)}</p>
                  {handoverQr ? (
                    <Image
                      className="qr"
                      src={handoverQr}
                      alt="Handover QR"
                      width={220}
                      height={220}
                      unoptimized
                    />
                  ) : null}
                  <code>{pendingHandover.scanToken}</code>
                  <div className="grid two">
                    <label className="field">
                      <span>Scanned token</span>
                      <input
                        value={scanToken}
                        onChange={(event) => setScanToken(event.target.value)}
                        placeholder="Paste scanned handover token"
                      />
                    </label>
                    <div className="field">
                      <span>Incoming caregiver</span>
                      <button className="subtle" onClick={claimHandover}>
                        Claim handover on this device
                      </button>
                    </div>
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

                  <div className="inline-meta">
                    <span>
                      Decision refs always available:{" "}
                      {(latestGroundTruth?.decisionRefs ?? []).join(", ") || "None"}
                    </span>
                  </div>
                  <button className="action" onClick={() => completeHandover(pendingHandover.sessionId)}>
                    Complete handover and generate receipt
                  </button>
                </div>
              ) : null}

              <div className="card">
                <h2>Care Wrapped receipts</h2>
                <div className="timeline">
                  {state.handoverSessions
                    .filter((session) => session.receipt)
                    .map((session) => (
                      <article key={session.sessionId} className="timeline-item">
                        <div>
                          <strong>{session.sessionId}</strong>
                          <span>{session.completedAt ? formatDate(session.completedAt) : "Pending"}</span>
                        </div>
                        <p>{session.receipt?.notes}</p>
                        <small>
                          Reviewed: {session.receipt?.reviewedSections.join(", ")} | Decisions:{" "}
                          {session.receipt?.decisionRefs.join(", ")}
                        </small>
                      </article>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "coordination" && (
            <div className="stack">
              <div className="card">
                <h2>Shared task board</h2>
                <div className="grid two">
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
                  <div className="field">
                    <span>Action</span>
                    <button className="action" onClick={addTask}>
                      Add task
                    </button>
                  </div>
                </div>

                <div className="stack">
                  {state.tasks.map((task) => (
                    <article key={task.taskId} className="task-card">
                      <div>
                        <strong>{task.title}</strong>
                        <span>
                          {getMember(state, task.assignedTo)?.displayName} · {formatDate(task.dueAt)}
                        </span>
                      </div>
                      <button className="subtle" onClick={() => cycleTaskStatus(task.taskId)}>
                        Mark {task.status === "open" ? "claimed" : task.status === "claimed" ? "done" : "open"}
                      </button>
                    </article>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2>Narrative care diary</h2>
                <label className="field">
                  <span>New note</span>
                  <textarea
                    value={diaryText}
                    onChange={(event) => setDiaryText(event.target.value)}
                    placeholder="Add mood, appetite, or family context. Use #tags if helpful."
                  />
                </label>
                <button className="action" onClick={addDiaryEntry}>
                  Add diary entry
                </button>
                <div className="timeline">
                  {state.diaryEntries.map((entry) => (
                    <article key={entry.entryId} className="timeline-item">
                      <div>
                        <strong>{getMember(state, entry.createdBy)?.displayName}</strong>
                        <span>{formatDate(entry.createdAt)}</span>
                      </div>
                      <p>{entry.text}</p>
                      <small>{entry.tags.length ? `Tags: ${entry.tags.join(", ")}` : "No tags"}</small>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ingestion" && (
            <div className="stack">
              <div className="card">
                <h2>AI-assisted ingestion drafts</h2>
                <p>
                  This prototype keeps AI outputs as drafts until every proposed field is manually verified.
                </p>
                <div className="grid two">
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
                      <option value="photo">Photo parse</option>
                      <option value="voice">Voice memo summary</option>
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
                  <span>Simulated AI extraction input</span>
                  <textarea
                    value={draftInput.content}
                    onChange={(event) =>
                      setDraftInput((current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                    placeholder="Paste the note, transcript, or OCR text here"
                  />
                </label>
                <button className="action" onClick={createDraft}>
                  Generate verification draft
                </button>
              </div>

              <div className="stack">
                {state.ingestionDrafts.map((draft) => (
                  <article key={draft.draftId} className="card">
                    <div className="decision-head">
                      <strong>{draft.draftId}</strong>
                      <span>
                        {draft.type} · {draft.verificationState}
                      </span>
                    </div>
                    <p>{draft.rawAssetRef}</p>
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
                    <button
                      className="action"
                      onClick={() => commitDraft(draft.draftId)}
                      disabled={draft.verificationState !== "ready"}
                    >
                      Commit verified fields to Ground Truth
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "ask" && (
            <div className="stack">
              <div className="card">
                <h2>Ask Tandem</h2>
                <p>
                  Data-only answers across Ground Truth, Decision Records, tasks, diary, handovers, and drafts.
                </p>
                <label className="field">
                  <span>Question</span>
                  <input
                    value={queryText}
                    onChange={(event) => setQueryText(event.target.value)}
                    placeholder="e.g. What is the current amlodipine dosage?"
                  />
                </label>
                <button className="action" onClick={runQuery}>
                  Query records
                </button>
              </div>

              {queryAnswer ? (
                <div className="card">
                  <h2>Answer</h2>
                  <p>{queryAnswer.answer}</p>
                  <div className="stack">
                    {queryAnswer.citations.map((item) => (
                      <div key={`${item.type}-${item.recordId}`} className="citation">
                        <strong>{item.type}</strong>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {queryAnswer.followUp ? <small>{queryAnswer.followUp}</small> : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <aside className="panel side-panel">
          <h2>Notification center</h2>
          <div className="stack">
            {state.notifications.map((notification) => (
              <article key={notification.notificationId} className="notification">
                <div>
                  <strong>{notification.payload.title}</strong>
                  <p>{notification.payload.body}</p>
                  <small>{formatDate(notification.createdAt)}</small>
                </div>
                {!notification.readAt ? (
                  <button className="subtle" onClick={() => markNotificationRead(notification.notificationId)}>
                    Mark read
                  </button>
                ) : (
                  <small>Read</small>
                )}
              </article>
            ))}
          </div>
        </aside>
      </section>

      {!isReady ? <div className="loading">Loading Tandem records...</div> : null}
    </main>
  );
}
