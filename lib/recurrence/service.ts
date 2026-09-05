import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { log } from "@/lib/log/logger";
import {
  BUDGET_ALERT_TONE,
  budgetAlertLevel,
  budgetAlertValue,
  budgetDedupKey,
} from "@/lib/alerts/model";
import { formatBalance } from "@/lib/format/money";
import { resolveScoringAxis } from "@/lib/transactions/model";
import {
  advanceRunDate,
  dueDates,
  feeAmount,
  feeDue,
  feeRunKey,
  firstOfMonth,
  monthKey,
  templateRunKey,
  type CronRecurrence,
} from "@/lib/recurrence/model";

/**
 * The daily cron worker (D2). Runs for EVERY user on the service client — there
 * is no session here; `app/api/cron/run` gates the whole thing on `CRON_SECRET`.
 *
 *   1. recurring templates  → generate the due transactions, advance the cursor
 *   2. monthly account fees → charge bank/card accounts once per month
 *   3. budget alerts        → raise a 92 %+ alert once per budget per month
 *
 * Idempotent: every generated transaction carries a `recurrence_key` behind a
 * unique index, so a second run the same day inserts nothing.
 */

export interface CronSummary {
  templateRows: number;
  feeRows: number;
  budgetAlerts: number;
}

const UNIQUE_VIOLATION = "23505";

async function primaryAccountByUser(
  db: SupabaseClient,
): Promise<Map<string, string>> {
  const { data } = await db
    .from("accounts")
    .select("id, user_id")
    .eq("is_primary", true);
  return new Map((data ?? []).map((a) => [a.user_id as string, a.id as string]));
}

/** Insert a cron-generated row; a duplicate `recurrence_key` is a silent no-op. */
async function insertGenerated(
  db: SupabaseClient,
  row: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await db.from("transactions").insert(row);
  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  throw error;
}

/** Insert a generated alert; a duplicate `dedup_key` is a silent no-op. */
async function insertAlert(
  db: SupabaseClient,
  row: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await db.from("alerts").insert(row);
  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  throw error;
}

// ── 1. recurring templates ────────────────────────────────────────────────

async function runTemplates(db: SupabaseClient, today: string): Promise<number> {
  const { data: templates, error } = await db
    .from("templates")
    .select(
      "id, user_id, name, kind, amount, category_id, linked_to_type, linked_to_id, account_id, recurrence, next_run_on, usage_count",
    )
    .not("next_run_on", "is", null)
    .lte("next_run_on", today);
  if (error) throw error;
  if (!templates?.length) return 0;

  const primaries = await primaryAccountByUser(db);

  // category axis lookup for scoring_axis resolution
  const catIds = [
    ...new Set(templates.map((t) => t.category_id).filter(Boolean) as string[]),
  ];
  const axisByCat = new Map<string, string | null>();
  if (catIds.length) {
    const { data: cats } = await db
      .from("categories")
      .select("id, axis")
      .in("id", catIds);
    for (const c of cats ?? []) axisByCat.set(c.id, c.axis);
  }

  let generated = 0;

  for (const t of templates) {
    const recurrence = t.recurrence as CronRecurrence;
    if (recurrence !== "daily" && recurrence !== "monthly") continue;

    const account = (t.account_id as string | null) ?? primaries.get(t.user_id);
    if (!account) {
      log.warn("cron.template_skipped", { id: t.id, reason: "no_account" });
      continue;
    }

    const dates = dueDates(t.next_run_on as string, today, recurrence);
    let runs = 0;
    for (const occurredOn of dates) {
      const isExpense = t.kind === "expense";
      const row: Record<string, unknown> = {
        user_id: t.user_id,
        type: isExpense ? "expense" : "income",
        amount: Number(t.amount),
        occurred_on: occurredOn,
        status: "done",
        category_id: t.category_id ?? null,
        source_account_id: isExpense ? account : null,
        destination_account_id: isExpense ? null : account,
        linked_to_type: t.linked_to_type ?? null,
        linked_to_id: t.linked_to_id ?? null,
        scoring_axis: resolveScoringAxis({
          type: isExpense ? "expense" : "income",
          categoryAxis: t.category_id
            ? (axisByCat.get(t.category_id) ?? null)
            : null,
          linkedToType:
            (t.linked_to_type as "person" | "project" | null) ?? null,
        }),
        template_id: t.id,
        recurrence: "once",
        recurrence_key: templateRunKey(t.id as string, occurredOn),
        note: t.name,
      };
      if (await insertGenerated(db, row)) {
        generated += 1;
        runs += 1;
      }
    }

    const lastDate = dates.at(-1);
    if (lastDate) {
      await db
        .from("templates")
        .update({
          last_run_on: lastDate,
          next_run_on: advanceRunDate(lastDate, recurrence),
          usage_count: Number(t.usage_count ?? 0) + runs,
        })
        .eq("id", t.id);
    }
  }

  return generated;
}

// ── 2. monthly account fees ───────────────────────────────────────────────

async function runAccountFees(
  db: SupabaseClient,
  today: string,
): Promise<number> {
  const { data: accounts, error } = await db
    .from("accounts")
    .select("id, user_id, monthly_fee, fee_type, last_fee_on, type")
    .not("monthly_fee", "is", null)
    .eq("is_archived", false)
    .in("type", ["bank", "card"]);
  if (error) throw error;
  if (!accounts?.length) return 0;

  const { data: feeCats } = await db
    .from("categories")
    .select("id")
    .is("user_id", null)
    .eq("name", "Frais bancaires")
    .eq("kind", "expense")
    .order("created_at", { ascending: true })
    .limit(1);
  const feeCat = feeCats?.[0] ?? null;

  const ym = monthKey(today);
  const chargeDate = firstOfMonth(today);
  let charged = 0;

  for (const a of accounts) {
    if (!feeDue((a.last_fee_on as string | null) ?? null, today)) continue;

    const { data: balance } = await db.rpc("account_balance", {
      p_account_id: a.id,
    });
    const amount = feeAmount(
      (a.fee_type as "fixed" | "percent") ?? "fixed",
      Number(a.monthly_fee),
      Number(balance ?? 0),
    );

    if (amount > 0) {
      const inserted = await insertGenerated(db, {
        user_id: a.user_id,
        type: "expense",
        amount,
        occurred_on: chargeDate,
        status: "done",
        category_id: feeCat?.id ?? null,
        source_account_id: a.id,
        scoring_axis: "consumption",
        recurrence: "once",
        recurrence_key: feeRunKey(a.id as string, ym),
        note: "Frais mensuels",
      });
      if (inserted) charged += 1;
    }

    await db.from("accounts").update({ last_fee_on: chargeDate }).eq("id", a.id);
  }

  return charged;
}

// ── 3. budget threshold alerts (SCREEN-18) ────────────────────────────────

/**
 * Turn budgets that have crossed a threshold this month into inbox rows.
 *
 * Two thresholds, not one: 92 % is a warning, past 100 % is an overspend, and
 * SCREEN-18's artboard draws them as separate rows in separate colours. The old
 * version of this function emitted only one alert per budget per month, so a
 * budget that warned early and blew past its limit later could never report the
 * overspend at all.
 *
 * Idempotency is the DB's job now (`alerts_dedup_key_uq`, migration 0005). The
 * previous SELECT-then-INSERT was racy — two cron invocations could both see
 * "none" and both insert — and it used `.maybeSingle()` on a query that returns
 * many rows, which errors outright once a second alert exists for the budget.
 */
async function runBudgetAlerts(
  db: SupabaseClient,
  today: string,
): Promise<number> {
  const monthStart = firstOfMonth(today);
  const ym = monthKey(today);
  const { data: budgets, error } = await db
    .from("budgets")
    .select("id, user_id, category_id, allocated_amount");
  if (error) throw error;
  if (!budgets?.length) return 0;

  let created = 0;
  for (const b of budgets) {
    const { data: rows } = await db
      .from("transactions")
      .select("amount")
      .eq("user_id", b.user_id)
      .eq("type", "expense")
      .eq("status", "done")
      .eq("category_id", b.category_id)
      .gte("occurred_on", monthStart);

    const spent = (rows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
    const allocated = Number(b.allocated_amount);
    const level = budgetAlertLevel(spent, allocated);
    if (!level) continue;

    const { data: cat } = await db
      .from("categories")
      .select("name")
      .eq("id", b.category_id)
      .maybeSingle();
    // A budget always has a category, but a deleted one leaves the join empty;
    // "Budget  approche sa limite" with a hole in it would be worse than a
    // generic word.
    const name = (cat?.name as string | undefined)?.trim() || "sans catégorie";

    const inserted = await insertAlert(db, {
      user_id: b.user_id,
      kind: "alert",
      title:
        level === "over"
          ? `Dépassement Budget ${name}`
          : `Budget ${name} approche sa limite`,
      body:
        level === "over"
          ? "Des dépenses de cette catégorie ont fait passer le budget au-dessus de sa limite. Un dépassement ne bloque rien, il vous informe."
          : "Cette catégorie a consommé plus de 92 % de son budget du mois. Il reste de la marge, mais peu.",
      value: budgetAlertValue(spent, allocated, level),
      tone: BUDGET_ALERT_TONE[level],
      // A snapshot, not a join: an alert must keep the limit that was in force
      // when it fired, even if the budget is edited afterwards.
      facts: [
        { label: "Budget concerné", value: name },
        { label: "Limite du mois", value: formatBalance(allocated, "XOF") },
        { label: "Dépensé", value: formatBalance(spent, "XOF") },
      ],
      link_type: "budget",
      link_id: b.id,
      dedup_key: budgetDedupKey(b.id as string, ym, level),
    });
    if (inserted) created += 1;
  }
  return created;
}

// ── entrypoint ────────────────────────────────────────────────────────────

export async function runDailyCron(
  db: SupabaseClient,
  today: string,
): Promise<CronSummary> {
  const templateRows = await runTemplates(db, today);
  const feeRows = await runAccountFees(db, today);
  const budgetAlerts = await runBudgetAlerts(db, today);
  return { templateRows, feeRows, budgetAlerts };
}
