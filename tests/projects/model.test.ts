import { test } from "node:test";
import assert from "node:assert/strict";

import {
  emptyProjectDraft,
  projectDraftToPayload,
  projectFormErrors,
  projectProgress,
  sortProjects,
  type ProjectListItem,
} from "../../lib/projects/model.ts";

const p = (o: Partial<ProjectListItem>): ProjectListItem => ({
  id: "p",
  name: "Maison",
  description: "2 chambres",
  category: "construction",
  target_amount: null,
  allocated_amount: 0,
  spent: 0,
  status: "active",
  account_id: null,
  is_favorite: false,
  start_date: null,
  end_date: null,
  tx_count: 0,
  created_at: "2026-09-01T00:00:00Z",
  ...o,
});

test("projectProgress: null without a target, tones by ratio", () => {
  assert.equal(projectProgress(500, null), null);
  assert.equal(projectProgress(500, 0), null);
  assert.equal(projectProgress(250_000, 1_000_000)!.tone, "green");
  assert.equal(projectProgress(700_000, 1_000_000)!.tone, "orange");
  assert.equal(projectProgress(950_000, 1_000_000)!.tone, "red");
  assert.equal(projectProgress(500_000, 1_000_000)!.percent, 50);
});

test("sortProjects: amount uses target, favorite first", () => {
  const rows = [
    p({ id: "1", target_amount: 100, created_at: "2026-09-01T00:00:00Z" }),
    p({ id: "2", target_amount: 900, created_at: "2026-09-02T00:00:00Z" }),
    p({ id: "3", is_favorite: true, created_at: "2026-09-03T00:00:00Z" }),
  ];
  assert.deepEqual(sortProjects(rows, "amount").map((r) => r.id), ["2", "1", "3"]);
  assert.deepEqual(sortProjects(rows, "favorite").map((r) => r.id), ["3", "2", "1"]);
});

test("projectFormErrors: name + description required, date order", () => {
  assert.deepEqual(projectFormErrors(emptyProjectDraft()), ["name", "description"]);
  assert.ok(
    projectFormErrors({
      ...emptyProjectDraft(),
      name: "X",
      description: "y",
      startDate: "2026-05-01",
      endDate: "2026-04-01",
    }).includes("dateOrder"),
  );
  assert.deepEqual(
    projectFormErrors({ ...emptyProjectDraft(), name: "X", description: "y" }),
    [],
  );
});

test("projectDraftToPayload: empty target/dates become null", () => {
  const payload = projectDraftToPayload({
    ...emptyProjectDraft(),
    name: " Voiture ",
    description: " occasion ",
    category: "acquisition",
    targetAmount: "",
    startDate: "",
    endDate: "",
  });
  assert.equal(payload.name, "Voiture");
  assert.equal(payload.target_amount, null);
  assert.equal(payload.start_date, null);
  assert.equal(payload.category, "acquisition");

  const withTarget = projectDraftToPayload({
    ...emptyProjectDraft(),
    name: "X",
    description: "y",
    targetAmount: "10 000 000",
  });
  assert.equal(withTarget.target_amount, 10_000_000);
});
