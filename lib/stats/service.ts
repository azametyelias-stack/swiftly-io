import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolvePeriod } from "@/lib/dashboard/period";
import { computeAggregate, type TxRow } from "@/lib/dashboard/aggregates";
import {
  aggregate,
  breakdown,
  buildReport,
  availableReportKeys,
  computeScore,
  previousReportKey,
  reportPeriodRange,
  variation,
  withOthers,
  type BreakdownDimension,
  type PatrimoinePayload,
  type ReportListPayload,
  type SpendModePayload,
  type StatsBreakdownPayload,
  type StatsPayload,
  type StatTx,
} from "@/lib/stats/model";
import type { StatsQueryInput } from "@/lib/validation/schemas";

export type {
  ScorePayload,
  SpendModePayload,
  StatsBreakdownPayload,
  StatsPayload,
  PatrimoinePayload,
  ReportListPayload,
} from "@/lib/stats/model";

/**
 * Server-side reads for Statistiques / Rapport (SCREEN-11/12). All queries are
 * scoped `user_id = <caller>` (RLS is the net). The Score and the Rapport are
 * ALWAYS global (over every account) — "revenus passifs ÷ dépenses totales" only
 * means something for the whole household. The overview + breakdowns follow the
 * account selector (SCREEN-11 § 3).
 */

const TX_COLUMNS = `
  type, amount, occurred_on, status, scoring_axis,
  category_id, source_account_id, destination_account_id, linked_to_type, linked_to_id
`;

async function fetchStatTx(
  db: SupabaseClient,
  userId: string,
  start: string,
  end: string,
  accountId?: string | null,
): Promise<StatTx[]> {
  let q = db
    .from("transactions")
    .select(TX_COLUMNS)
    .eq("user_id", userId)
    .gte("occurred_on", start)
    .lt("occurred_on", end);
  if (accountId) {
    q = q.or(
      `source_account_id.eq.${accountId},destination_account_id.eq.${accountId}`,
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];

  // resolve names in bulk
  const catIds = new Set<string>();
  const acctIds = new Set<string>();
  const personIds = new Set<string>();
  const projectIds = new Set<string>();
  for (const r of rows) {
    if (r.category_id) catIds.add(r.category_id);
    if (r.source_account_id) acctIds.add(r.source_account_id);
    if (r.destination_account_id) acctIds.add(r.destination_account_id);
    if (r.linked_to_id && r.linked_to_type === "person") personIds.add(r.linked_to_id);
    if (r.linked_to_id && r.linked_to_type === "project") projectIds.add(r.linked_to_id);
  }

  const [cats, accts, people, projects] = await Promise.all([
    catIds.size
      ? db.from("categories").select("id, name, color").in("id", [...catIds])
      : Promise.resolve({ data: [] as { id: string; name: string; color: string }[] }),
    acctIds.size
      ? db.from("accounts").select("id, name, type").in("id", [...acctIds])
      : Promise.resolve({ data: [] as { id: string; name: string; type: string }[] }),
    personIds.size
      ? db.from("people").select("id, name").eq("user_id", userId).in("id", [...personIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    projectIds.size
      ? db.from("projects").select("id, name").eq("user_id", userId).in("id", [...projectIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const catMap = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const acctMap = new Map((accts.data ?? []).map((a) => [a.id, a]));
  const personMap = new Map((people.data ?? []).map((p) => [p.id, p]));
  const projectMap = new Map((projects.data ?? []).map((p) => [p.id, p]));

  return rows.map((r) => {
    const cat = r.category_id ? catMap.get(r.category_id) : null;
    const src = r.source_account_id ? acctMap.get(r.source_account_id) : null;
    const dst = r.destination_account_id ? acctMap.get(r.destination_account_id) : null;
    let linked: StatTx["linked_to"] = null;
    if (r.linked_to_id && r.linked_to_type === "person") {
      const p = personMap.get(r.linked_to_id);
      if (p) linked = { type: "person", id: p.id, name: p.name };
    } else if (r.linked_to_id && r.linked_to_type === "project") {
      const p = projectMap.get(r.linked_to_id);
      if (p) linked = { type: "project", id: p.id, name: p.name };
    }
    return {
      type: r.type,
      amount: Number(r.amount),
      occurred_on: r.occurred_on,
      status: r.status,
      scoring_axis: r.scoring_axis,
      category: cat ? { id: cat.id, name: cat.name, color: cat.color } : null,
      source_account: src ? { id: src.id, name: src.name } : null,
      destination_account: dst ? { id: dst.id, name: dst.name } : null,
      linked_to: linked,
    } satisfies StatTx;
  });
}

// ── SCREEN-11 ──────────────────────────────────────────────────────────────

function splitPeriod(start: string, end: string, n: number): { start: string; end: string }[] {
  const s = Date.parse(start + "T00:00:00Z");
  const e = Date.parse(end + "T00:00:00Z");
  const step = (e - s) / n;
  const out: { start: string; end: string }[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push({
      start: new Date(s + i * step).toISOString().slice(0, 10),
      end: new Date(s + (i + 1) * step).toISOString().slice(0, 10),
    });
  }
  return out;
}

function spendMode(
  side: "expense" | "income",
  cur: StatTx[],
  prev: StatTx[],
  range: { start: string; end: string },
  bucketLabel: (i: number) => string,
): SpendModePayload {
  const a = aggregate(cur);
  const p = aggregate(prev);
  const total = side === "expense" ? a.expenses : a.income;
  const prevTotal = side === "expense" ? p.expenses : p.income;

  const parts = splitPeriod(range.start, range.end, 4);
  const buckets = parts.map((seg, i) => {
    const inSeg = cur.filter((t) => t.occurred_on >= seg.start && t.occurred_on < seg.end);
    const agg = aggregate(inSeg);
    return { label: bucketLabel(i), amount: side === "expense" ? agg.expenses : agg.income };
  });

  const byCat = breakdown(cur, side, "category");
  const prevByCat = new Map(breakdown(prev, side, "category").map((e) => [e.key, e.amount]));
  const rising = byCat
    .map((e) => ({
      label: e.label,
      variation: variation(e.amount, prevByCat.get(e.key) ?? 0),
    }))
    .filter((r): r is { label: string; variation: number } => r.variation !== null && r.variation > 0)
    .sort((x, y) => y.variation - x.variation)
    .slice(0, 3);

  return {
    total,
    variation: variation(total, prevTotal),
    buckets,
    splitA: side === "expense" ? a.investmentExpense : a.activeIncome,
    splitB: side === "expense" ? a.consumptionExpense : a.passiveIncome,
    rising,
  };
}

export async function getStats(
  db: SupabaseClient,
  userId: string,
  q: StatsQueryInput,
): Promise<StatsPayload | null> {
  // Resolve the account selector.
  let account: { id: string; name: string } | null = null;
  if (q.account) {
    const { data } = await db
      .from("accounts")
      .select("id, name")
      .eq("user_id", userId)
      .eq("id", q.account)
      .maybeSingle();
    if (!data) return null;
    account = data;
  }

  const range = resolvePeriod(q.period);
  const prevRange = { start: range.previous.start, end: range.previous.end };

  const curTx = await fetchStatTx(db, userId, range.start, range.end, account?.id);
  const prevTx = await fetchStatTx(db, userId, prevRange.start, prevRange.end, account?.id);

  // ----- overview (reuses the dashboard curve maths) -----
  const acctForCurve = account?.id
    ? account.id
    : (
        await db
          .from("accounts")
          .select("id, name, initial_balance, is_primary")
          .eq("user_id", userId)
          .eq("is_archived", false)
          .eq("is_primary", true)
          .maybeSingle()
      ).data?.id ?? null;

  const curAgg = aggregate(curTx);
  const prevAgg = aggregate(prevTx);

  let overview: StatsPayload["overview"] = {
    curve: null,
    startBalance: 0,
    currentBalance: 0,
    income: curAgg.income,
    expenses: curAgg.expenses,
    net: curAgg.net,
    netVariation: variation(curAgg.net, prevAgg.net),
    passiveIncome: curAgg.passiveIncome,
  };

  if (acctForCurve) {
    const { data: acct } = await db
      .from("accounts")
      .select("id, initial_balance")
      .eq("id", acctForCurve)
      .maybeSingle();
    const { data: allTx } = await db
      .from("transactions")
      .select("type, amount, occurred_on, status, source_account_id, destination_account_id")
      .eq("user_id", userId)
      .or(`source_account_id.eq.${acctForCurve},destination_account_id.eq.${acctForCurve}`)
      .lt("occurred_on", range.end);
    const rows: TxRow[] = (allTx ?? []).map((t) => ({
      type: t.type,
      amount: Number(t.amount),
      occurred_on: t.occurred_on,
      status: t.status,
      source_account_id: t.source_account_id,
      destination_account_id: t.destination_account_id,
    }));
    const agg = computeAggregate({
      initialBalance: Number(acct?.initial_balance ?? 0),
      transactions: rows,
      accountId: acctForCurve,
      rangeStart: range.start,
      rangeEnd: range.end,
      buckets: range.buckets,
    });
    const { data: liveBalance } = await db.rpc("account_balance", {
      p_account_id: acctForCurve,
    });
    const hasSettled = rows.some((t) => t.status !== "planned");
    overview = {
      ...overview,
      curve: hasSettled ? agg.curve : null,
      startBalance: agg.startBalance,
      currentBalance: Number(liveBalance ?? agg.endBalance),
    };
  }

  const base: StatsPayload = {
    mode: q.mode,
    period: q.period,
    account,
    overview,
    expenseBreakdown: null,
    incomeBreakdown: null,
    score: null,
    expenseMode: null,
    incomeMode: null,
    patrimoine: null,
  };

  if (q.mode === "apercu") {
    base.expenseBreakdown = breakdownPayload(curTx, prevTx, "expense", q.expense_by);
    base.incomeBreakdown = breakdownPayload(curTx, prevTx, "income", q.income_by);
    // Score is GLOBAL — recompute over every account for the same period.
    const globalCur =
      account?.id != null
        ? await fetchStatTx(db, userId, range.start, range.end, null)
        : curTx;
    const s = computeScore(aggregate(globalCur));
    base.score = { score: s.score, tier: s.tier, criteria: s.criteria };
  } else if (q.mode === "expense" || q.mode === "income") {
    const mode = spendMode(
      q.mode,
      curTx,
      prevTx,
      { start: range.start, end: range.end },
      (i) => `S${i + 1}`,
    );
    if (q.mode === "expense") base.expenseMode = mode;
    else base.incomeMode = mode;
  } else if (q.mode === "patrimoine") {
    base.patrimoine = await getPatrimoine(db, userId);
  }

  return base;
}

function breakdownPayload(
  cur: StatTx[],
  prev: StatTx[],
  side: "expense" | "income",
  by: BreakdownDimension,
): StatsBreakdownPayload {
  const entries = withOthers(breakdown(cur, side, by), 4, "");
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const prevTotal = breakdown(prev, side, by).reduce((s, e) => s + e.amount, 0);
  return { by, total, totalVariation: variation(total, prevTotal), entries };
}

async function getPatrimoine(
  db: SupabaseClient,
  userId: string,
): Promise<PatrimoinePayload> {
  const { data: accts } = await db
    .from("accounts")
    .select("id, name, type")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });
  const accounts = await Promise.all(
    (accts ?? []).map(async (a) => {
      const { data } = await db.rpc("account_balance", { p_account_id: a.id });
      return { id: a.id, name: a.name, type: a.type, balance: Number(data ?? 0) };
    }),
  );
  const accountsValue = accounts.reduce((s, a) => s + a.balance, 0);

  const { data: projects } = await db
    .from("projects")
    .select("id, name, category, allocated_amount, target_amount")
    .eq("user_id", userId)
    .eq("status", "done");
  const completedProjects = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    amount: Number(p.target_amount ?? p.allocated_amount ?? 0),
  }));
  const projectsValue = completedProjects.reduce((s, p) => s + p.amount, 0);

  return {
    estimated: accountsValue + projectsValue,
    accountsValue,
    projectsValue,
    accounts,
    completedProjects,
  };
}

// ── SCREEN-12 (Rapport) ────────────────────────────────────────────────────

async function earliestTxMonth(
  db: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await db
    .from("transactions")
    .select("occurred_on")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return data.occurred_on.slice(0, 7);
}

export async function getReport(
  db: SupabaseClient,
  userId: string,
  periodKey: string | undefined,
  now = new Date(),
): Promise<ReportListPayload> {
  const earliest = await earliestTxMonth(db, userId);
  const keys = availableReportKeys(now, earliest);
  const periods = keys.map((k) => ({
    key: k,
    type: (/^\d{4}$/.test(k) ? "annual" : "monthly") as "monthly" | "annual",
  }));

  const target = periodKey && keys.includes(periodKey) ? periodKey : keys[0];
  if (!target) return { periods, report: null };

  const range = reportPeriodRange(target);
  const prevKey = previousReportKey(target);
  const prevRange = reportPeriodRange(prevKey);

  const [cur, prev] = await Promise.all([
    fetchStatTx(db, userId, range.start, range.end, null),
    fetchStatTx(db, userId, prevRange.start, prevRange.end, null),
  ]);

  // NOTE: the `reports` row (read-state, "rapport prêt" Dashboard banner + alert)
  // is wired in Lot 6 with the notification system. Content is computed on the
  // fly here (SCREEN-12 § 5 "calcul en temps réel").
  const report = buildReport({ periodKey: target, now, current: cur, previous: prev });

  return { periods, report };
}
