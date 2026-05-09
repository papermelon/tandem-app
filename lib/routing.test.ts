import { strict as assert } from "node:assert";
import { test } from "node:test";

import { ROUTING_SCORE_FLOOR, rankAssignees } from "./routing.ts";
import type { FamilyMember, Task } from "./types.ts";

// Run with: node --test --experimental-strip-types lib/routing.test.ts
// (Node 22+; no test runner installed in package.json yet.)

const NOW = new Date("2026-05-10T00:00:00Z");

function dueIn(days: number): string {
  return new Date(NOW.getTime() + days * 86_400_000).toISOString();
}

const baseMembers: FamilyMember[] = [
  { id: "rachel", name: "Rachel", role: "Lead", avatar: "R", isDefaultCaregiver: true },
  { id: "ming", name: "Ming", role: "Sibling", avatar: "M" },
  { id: "lina", name: "Lina", role: "Sibling", avatar: "L" }
];

const baseTasks: Task[] = [
  { id: "t1", title: "Med refill", category: "medication", assigneeId: "rachel", dueDate: dueIn(2), status: "claimed", priority: "medium" },
  { id: "t2", title: "Med night reminder", category: "medication", assigneeId: "rachel", dueDate: dueIn(1), status: "claimed", priority: "medium" },
  { id: "t3", title: "Polyclinic review", category: "appointment", assigneeId: "rachel", dueDate: dueIn(5), status: "claimed", priority: "medium" },
  { id: "t4", title: "AIC call", category: "admin", assigneeId: "lina", dueDate: dueIn(3), status: "claimed", priority: "medium" },
  { id: "t5", title: "HDB upload", category: "admin", assigneeId: "lina", dueDate: dueIn(4), status: "claimed", priority: "medium" },
  { id: "t6", title: "Rehab invoice", category: "finance", assigneeId: "ming", dueDate: dueIn(6), status: "claimed", priority: "low" }
];

test("category affinity ranks medication owner first", () => {
  const ranked = rankAssignees(
    { category: "medication", dueAt: dueIn(2) },
    { members: baseMembers, tasks: baseTasks, now: NOW }
  );
  assert.equal(ranked[0]?.memberId, "rachel");
  assert.ok(
    ranked[0]!.reasons.some((r) => r.toLowerCase().includes("medication")),
    `expected a medication reason, got ${JSON.stringify(ranked[0]!.reasons)}`
  );
});

test("admin task prefers Lina over Rachel despite default bias", () => {
  const ranked = rankAssignees(
    { category: "admin", dueAt: dueIn(3) },
    { members: baseMembers, tasks: baseTasks, now: NOW }
  );
  assert.equal(ranked[0]?.memberId, "lina");
});

test("score floor filters low-fit candidates", () => {
  const sparseMembers: FamilyMember[] = [
    { id: "x", name: "X", role: "S", avatar: "X" },
    { id: "y", name: "Y", role: "S", avatar: "Y" }
  ];
  const ranked = rankAssignees(
    { category: "home safety", dueAt: dueIn(30) },
    { members: sparseMembers, tasks: [], now: NOW }
  );
  // No history, no preference, no default, due far away → all below floor.
  for (const c of ranked) assert.ok(c.score >= ROUTING_SCORE_FLOOR);
});

test("explicit preference outweighs zero history", () => {
  const members: FamilyMember[] = [
    { id: "rachel", name: "Rachel", role: "Lead", avatar: "R", isDefaultCaregiver: true },
    { id: "ming", name: "Ming", role: "Sibling", avatar: "M", categoryPreferences: ["transport"] }
  ];
  const ranked = rankAssignees(
    { category: "transport", dueAt: dueIn(1) },
    { members, tasks: [], now: NOW }
  );
  assert.equal(ranked[0]?.memberId, "ming");
});

test("default caregiver wins ties when scores match", () => {
  const members: FamilyMember[] = [
    { id: "ming", name: "Ming", role: "Sibling", avatar: "M" },
    { id: "rachel", name: "Rachel", role: "Lead", avatar: "R", isDefaultCaregiver: true }
  ];
  const ranked = rankAssignees(
    { category: "check-in", dueAt: dueIn(1) },
    { members, tasks: [], now: NOW }
  );
  assert.equal(ranked[0]?.memberId, "rachel");
});

test("returns at most top N candidates", () => {
  const ranked = rankAssignees(
    { category: "appointment", dueAt: dueIn(2) },
    { members: baseMembers, tasks: baseTasks, now: NOW },
    2
  );
  assert.ok(ranked.length <= 2);
});

test("simulated 60%+ acceptance over varied items", () => {
  // Acceptance proxy: top candidate is the one a human lead would pick,
  // approximated as "the member with the most claimed tasks in this category,
  // breaking ties toward lighter load."
  const cases: Array<{ category: Task["category"]; expected: string }> = [
    { category: "medication", expected: "rachel" },
    { category: "appointment", expected: "rachel" },
    { category: "admin", expected: "lina" },
    { category: "finance", expected: "ming" },
    { category: "transport", expected: "rachel" }
  ];
  let hits = 0;
  for (const c of cases) {
    const ranked = rankAssignees(
      { category: c.category, dueAt: dueIn(2) },
      { members: baseMembers, tasks: baseTasks, now: NOW }
    );
    if (ranked[0]?.memberId === c.expected) hits++;
  }
  assert.ok(hits / cases.length >= 0.6, `acceptance ${hits}/${cases.length}`);
});
