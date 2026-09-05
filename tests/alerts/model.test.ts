import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ALERT_KINDS,
  ALERT_TONES,
  BUDGET_ALERT_TONE,
  BUDGET_WARN_RATIO,
  KIND_FILTERS,
  budgetAlertLevel,
  budgetAlertValue,
  budgetDedupKey,
  linkHref,
  matchesKind,
  sortAlerts,
  unreadCount,
  type AlertItem,
} from "../../lib/alerts/model.ts";

function alert(over: Partial<AlertItem> = {}): AlertItem {
  return {
    id: "a1",
    kind: "alert",
    title: "Dépassement Budget Shopping",
    body: "",
    value: "+16 %",
    tone: "danger",
    facts: [],
    link_type: null,
    link_id: null,
    read: false,
    created_at: "2026-08-27T18:40:00.000Z",
    ...over,
  };
}

test("only the two persisted kinds exist — a toast is not one of them", () => {
  // SCREEN-18 § 2: transient toasts are never stored and never listed. If a
  // third kind ever appears here, the inbox has stopped meaning anything.
  assert.deepEqual([...ALERT_KINDS], ["alert", "scheduled"]);
  assert.deepEqual([...KIND_FILTERS], ["all", "alert", "scheduled"]);
  assert.ok(matchesKind("alert", "all"));
  assert.ok(matchesKind("scheduled", "scheduled"));
  assert.ok(!matchesKind("alert", "scheduled"));
});

test("four tones, not three — the neutral is load-bearing", () => {
  assert.deepEqual([...ALERT_TONES], ["danger", "warn", "success", "neutral"]);
});

// ── § 4 sorting ────────────────────────────────────────────────────────────

test("sortAlerts recent: newest first", () => {
  const older = alert({ id: "old", created_at: "2026-08-01T08:00:00.000Z" });
  const newer = alert({ id: "new", created_at: "2026-08-27T18:40:00.000Z" });
  assert.deepEqual(
    sortAlerts([older, newer], "recent").map((a) => a.id),
    ["new", "old"],
  );
});

test("sortAlerts urgency: incident, then warning, then good news", () => {
  const rows = [
    alert({ id: "ok", tone: "success" }),
    alert({ id: "info", tone: "neutral" }),
    alert({ id: "bad", tone: "danger" }),
    alert({ id: "close", tone: "warn" }),
  ];
  assert.deepEqual(
    sortAlerts(rows, "urgency").map((a) => a.id),
    ["bad", "close", "ok", "info"],
  );
});

test("sortAlerts urgency: ties inside a tone stay newest-first", () => {
  const rows = [
    alert({ id: "old", tone: "danger", created_at: "2026-08-01T08:00:00.000Z" }),
    alert({ id: "new", tone: "danger", created_at: "2026-08-27T08:00:00.000Z" }),
  ];
  assert.deepEqual(
    sortAlerts(rows, "urgency").map((a) => a.id),
    ["new", "old"],
  );
});

test("sortAlerts frequent: the alert that recurs most comes first", () => {
  // "Plus utilisé" = déclenchée le plus souvent — the same alert month after
  // month, which is identified by its title.
  const rows = [
    alert({ id: "one", title: "Score financier", created_at: "2026-08-27T08:00:00.000Z" }),
    alert({ id: "a", title: "Budget Shopping", created_at: "2026-08-26T08:00:00.000Z" }),
    alert({ id: "b", title: "Budget Shopping", created_at: "2026-07-26T08:00:00.000Z" }),
  ];
  assert.deepEqual(
    sortAlerts(rows, "frequent").map((a) => a.id),
    ["a", "b", "one"],
  );
});

test("sortAlerts does not mutate its input", () => {
  const rows = [alert({ id: "a" }), alert({ id: "b", created_at: "2027-01-01T00:00:00.000Z" })];
  const before = rows.map((r) => r.id);
  sortAlerts(rows, "recent");
  assert.deepEqual(
    rows.map((r) => r.id),
    before,
  );
});

test("unreadCount counts only the unread", () => {
  assert.equal(unreadCount([alert({ read: false }), alert({ read: true })]), 1);
  assert.equal(unreadCount([]), 0);
});

// ── the contextual action of the detail screen ─────────────────────────────

test("linkHref points at the real route, or nowhere", () => {
  assert.equal(linkHref(alert()), null);
  assert.equal(
    linkHref(alert({ link_type: "budget", link_id: "b1" })),
    "/budgets/b1",
  );
  assert.equal(
    linkHref(alert({ link_type: "project", link_id: "p1" })),
    "/projets/p1",
  );
  assert.equal(
    linkHref(alert({ link_type: "transaction", link_id: "t1" })),
    "/historiques/t1",
  );
  assert.equal(linkHref(alert({ link_type: "report", link_id: "r1" })), "/rapport");
  // A half-filled link (the DB's alerts_link_consistent check forbids it, but
  // the type allows it) must not build "/budgets/null".
  assert.equal(linkHref(alert({ link_type: "budget", link_id: null })), null);
});

// ── budget thresholds — what the daily cron turns into rows ────────────────

test("budgetAlertLevel: nothing below 92 %, warn up to the limit, over past it", () => {
  assert.equal(budgetAlertLevel(0, 30_000), null);
  assert.equal(budgetAlertLevel(27_599, 30_000), null); // 91,99 %
  assert.equal(budgetAlertLevel(27_600, 30_000), "warn"); // exactly 92 %
  assert.equal(budgetAlertLevel(29_999, 30_000), "warn");
  assert.equal(budgetAlertLevel(30_000, 30_000), "over"); // exactly at the limit
  assert.equal(budgetAlertLevel(34_800, 30_000), "over");
  assert.equal(BUDGET_WARN_RATIO, 0.92);
});

test("budgetAlertLevel: a zero or absurd allocation never alerts", () => {
  // Every spend against a 0 budget is infinitely "over", including no spend at
  // all — such a budget must simply stay quiet.
  assert.equal(budgetAlertLevel(0, 0), null);
  assert.equal(budgetAlertLevel(5_000, 0), null);
  assert.equal(budgetAlertLevel(5_000, -100), null);
  assert.equal(budgetAlertLevel(Number.NaN, 30_000), null);
});

test("budgetAlertValue: the excess when over, the share consumed when warning", () => {
  // The artboard's row reads "+16 %", not "116 %" — how far past, not the total.
  assert.equal(budgetAlertValue(34_800, 30_000, "over"), "+16 %");
  assert.equal(budgetAlertValue(30_000, 30_000, "over"), "+0 %");
  assert.equal(budgetAlertValue(46_000, 50_000, "warn"), "92 %");
  // Floored, not rounded: 99,8 % must not display as "100 %" while the budget
  // is still under its limit.
  assert.equal(budgetAlertValue(29_950, 30_000, "warn"), "99 %");
});

test("budget tones match § 6: red for the incident, amber for the approach", () => {
  assert.equal(BUDGET_ALERT_TONE.over, "danger");
  assert.equal(BUDGET_ALERT_TONE.warn, "warn");
});

test("budgetDedupKey: one row per budget, per month, per level", () => {
  // Keyed by level as well as month, so a budget that warns at 92 % and later
  // goes over its limit produces both rows — the old one-per-month guard could
  // only ever report the first of the two.
  assert.equal(budgetDedupKey("b1", "2026-08", "warn"), "budget:b1:2026-08:warn");
  assert.notEqual(
    budgetDedupKey("b1", "2026-08", "warn"),
    budgetDedupKey("b1", "2026-08", "over"),
  );
  assert.notEqual(
    budgetDedupKey("b1", "2026-08", "over"),
    budgetDedupKey("b1", "2026-09", "over"),
  );
});
