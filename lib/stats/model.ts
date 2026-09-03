/**
 * Statistics + Score Financier + Rapport — the maths (SCREEN-11/12/13). Pure and
 * import-free so `tests/stats/model.test.ts` runs it under `node --test`.
 *
 * The model returns STRUCTURED data (numbers, keys, bands) — never a French
 * sentence. The i18n layer + components turn `criterion.band` / `priority.key`
 * into the wording.
 *
 * "Counts toward a total" mirrors `public.account_balance()` / the dashboard
 * aggregates exactly: income → status in (done, received); expense → status =
 * done. Transfers are neutral and never enter a stats total.
 */

export type StatTxType = "expense" | "income" | "transfer";

export interface StatRef {
  id: string;
  name: string;
  color?: string | null;
}

export interface StatTx {
  type: StatTxType;
  amount: number;
  occurred_on: string;
  status: string;
  /** investment | consumption | active | passive | null */
  scoring_axis: string | null;
  category: StatRef | null;
  source_account: StatRef | null;
  destination_account: StatRef | null;
  linked_to: (StatRef & { type: "person" | "project" }) | null;
}

function settledIncome(t: StatTx): boolean {
  return t.type === "income" && (t.status === "done" || t.status === "received");
}
function settledExpense(t: StatTx): boolean {
  return t.type === "expense" && t.status === "done";
}

// ── aggregation ────────────────────────────────────────────────────────────

export type BreakdownDimension = "category" | "account" | "person" | "project";

export interface BreakdownEntry {
  key: string;
  label: string;
  color: string | null;
  amount: number;
  count: number;
  share: number; // 0..1 of the total
}

export interface StatAggregate {
  income: number;
  expenses: number;
  net: number;
  activeIncome: number;
  passiveIncome: number;
  investmentExpense: number;
  consumptionExpense: number;
  /** distinct settled-income sources (linked_to, else category) */
  incomeSourceCount: number;
  expenseCount: number;
  incomeCount: number;
}

const UNASSIGNED = "__none__";

function dimensionOf(
  t: StatTx,
  by: BreakdownDimension,
  side: "income" | "expense",
): StatRef | null {
  if (by === "category") return t.category;
  if (by === "account")
    return side === "income" ? t.destination_account : t.source_account;
  if (by === "person") return t.linked_to?.type === "person" ? t.linked_to : null;
  if (by === "project")
    return t.linked_to?.type === "project" ? t.linked_to : null;
  return null;
}

export function aggregate(txs: StatTx[]): StatAggregate {
  let income = 0;
  let expenses = 0;
  let activeIncome = 0;
  let passiveIncome = 0;
  let investmentExpense = 0;
  let consumptionExpense = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  const sources = new Set<string>();

  for (const t of txs) {
    if (settledIncome(t)) {
      income += t.amount;
      incomeCount += 1;
      if (t.scoring_axis === "passive") passiveIncome += t.amount;
      else activeIncome += t.amount;
      sources.add(t.linked_to?.id ?? t.category?.id ?? UNASSIGNED);
    } else if (settledExpense(t)) {
      expenses += t.amount;
      expenseCount += 1;
      if (t.scoring_axis === "investment") investmentExpense += t.amount;
      else if (t.scoring_axis === "consumption") consumptionExpense += t.amount;
    }
  }

  return {
    income,
    expenses,
    net: income - expenses,
    activeIncome,
    passiveIncome,
    investmentExpense,
    consumptionExpense,
    incomeSourceCount: sources.size,
    expenseCount,
    incomeCount,
  };
}

export function breakdown(
  txs: StatTx[],
  side: "income" | "expense",
  by: BreakdownDimension,
): BreakdownEntry[] {
  const keep = side === "income" ? settledIncome : settledExpense;
  const buckets = new Map<string, BreakdownEntry>();
  let total = 0;

  for (const t of txs) {
    if (!keep(t)) continue;
    total += t.amount;
    const ref = dimensionOf(t, by, side);
    const key = ref?.id ?? UNASSIGNED;
    let b = buckets.get(key);
    if (!b) {
      b = {
        key,
        label: ref?.name ?? "",
        color: ref?.color ?? null,
        amount: 0,
        count: 0,
        share: 0,
      };
      buckets.set(key, b);
    }
    b.amount += t.amount;
    b.count += 1;
  }

  const entries = [...buckets.values()].sort((a, b) => b.amount - a.amount);
  for (const e of entries) e.share = total > 0 ? e.amount / total : 0;
  return entries;
}

/**
 * Fold everything past rank `topN` into a single "Autres" bucket (SCREEN-11 § 5
 * "Regrouper les petits postes"). `otherKey`/`otherLabel` name it.
 */
export function withOthers(
  entries: BreakdownEntry[],
  topN: number,
  otherLabel: string,
): BreakdownEntry[] {
  if (entries.length <= topN + 1) return entries;
  const head = entries.slice(0, topN);
  const tail = entries.slice(topN);
  const other: BreakdownEntry = {
    key: "__other__",
    label: otherLabel,
    color: null,
    amount: tail.reduce((s, e) => s + e.amount, 0),
    count: tail.reduce((s, e) => s + e.count, 0),
    share: tail.reduce((s, e) => s + e.share, 0),
  };
  return [...head, other];
}

// ── score financier (SCREEN-11 § 7) ───────────────────────────────────────

export type CriterionKey =
  | "liberte"
  | "investissement"
  | "epargne"
  | "diversification";

export const CRITERION_WEIGHT: Record<CriterionKey, number> = {
  liberte: 0.4,
  investissement: 0.25,
  epargne: 0.25,
  diversification: 0.1,
};

export type ScoreBand = "low" | "mid" | "high";

export interface Criterion {
  key: CriterionKey;
  weight: number;
  /** the headline value: a percentage for 1-3, a raw count for diversification */
  value: number;
  /** 0..100, used for the score maths and the progress bar */
  normalized: number;
  band: ScoreBand;
}

export type ScoreTier = "faible" | "moyen" | "bon" | "excellent";

export interface ScoreResult {
  score: number;
  tier: ScoreTier;
  criteria: Criterion[];
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return numerator > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
}

function bandOf(normalized: number): ScoreBand {
  if (normalized < 34) return "low";
  if (normalized < 67) return "mid";
  return "high";
}

export function scoreTier(score: number): ScoreTier {
  if (score <= 40) return "faible";
  if (score <= 60) return "moyen";
  if (score <= 80) return "bon";
  return "excellent";
}

export function computeScore(a: StatAggregate): ScoreResult {
  const liberteVal = pct(a.passiveIncome, a.expenses);
  const investVal = pct(a.investmentExpense, a.expenses);
  const epargneVal = a.income > 0 ? Math.max(0, (a.net / a.income) * 100) : 0;
  const diversNorm = (Math.min(a.incomeSourceCount, 4) / 4) * 100;

  const criteria: Criterion[] = [
    { key: "liberte", weight: 0.4, value: round1(liberteVal), normalized: liberteVal, band: bandOf(liberteVal) },
    { key: "investissement", weight: 0.25, value: round1(investVal), normalized: investVal, band: bandOf(investVal) },
    { key: "epargne", weight: 0.25, value: round1(Math.min(100, epargneVal)), normalized: Math.min(100, epargneVal), band: bandOf(Math.min(100, epargneVal)) },
    { key: "diversification", weight: 0.1, value: a.incomeSourceCount, normalized: diversNorm, band: bandOf(diversNorm) },
  ];

  const score = Math.round(
    criteria.reduce((s, c) => s + c.weight * c.normalized, 0),
  );

  return { score, tier: scoreTier(score), criteria };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── report periods (SCREEN-12) ────────────────────────────────────────────

export type ReportPeriodType = "monthly" | "annual";

export interface ReportPeriodRange {
  key: string; // "2026-06" | "2026"
  type: ReportPeriodType;
  start: string; // inclusive YYYY-MM-DD
  end: string; // exclusive YYYY-MM-DD
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function reportPeriodRange(key: string): ReportPeriodRange {
  if (/^\d{4}$/.test(key)) {
    const y = Number(key);
    return {
      key,
      type: "annual",
      start: `${y}-01-01`,
      end: `${y + 1}-01-01`,
    };
  }
  const [y, m] = key.split("-").map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(y!, m!, 1));
  return {
    key,
    type: "monthly",
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function previousReportKey(key: string): string {
  if (/^\d{4}$/.test(key)) return String(Number(key) - 1);
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 2, 1));
  return monthKey(d);
}

/**
 * The completed report periods available at `now`, newest first: every month
 * strictly before the current month, back to `earliest` (a YYYY-MM), plus the
 * completed years.
 */
export function availableReportKeys(
  now: Date,
  earliest: string | null,
): string[] {
  if (!earliest) return [];
  const curMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [ey, em] = earliest.split("-").map(Number);
  const cursor = new Date(Date.UTC(ey!, (em ?? 1) - 1, 1));

  const months: string[] = [];
  const years = new Set<number>();
  while (cursor < curMonth) {
    months.push(monthKey(cursor));
    // a year is "complete" once we've passed its December
    if (cursor.getUTCMonth() === 11) years.add(cursor.getUTCFullYear());
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  months.reverse();
  const yearKeys = [...years].sort((a, b) => b - a).map(String);
  return [...months, ...yearKeys];
}

export function isReportKey(v: unknown): v is string {
  return typeof v === "string" && (/^\d{4}-\d{2}$/.test(v) || /^\d{4}$/.test(v));
}

// ── report payload (SCREEN-12 §§ 1-6 + 10 — D6) ───────────────────────────

export function variation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface ReportCriterion extends Criterion {
  delta: number | null; // vs previous period, in points of `value`
}

export interface ReportPayload {
  periodKey: string;
  periodType: ReportPeriodType;
  overview: {
    income: number;
    incomeVariation: number | null;
    activeIncome: number;
    passiveIncome: number;
    expenses: number;
    expenseVariation: number | null;
    investmentExpense: number;
    consumptionExpense: number;
    net: number;
  };
  score: { value: number; tier: ScoreTier; delta: number | null };
  criteria: ReportCriterion[];
  projection: {
    percent: number;
    monthsToIndependence: number | null;
    estimatedDate: string | null;
  };
  strengths: { key: string; magnitude: number }[];
  priorityCriterion: CriterionKey;
  advice: { key: string; criterion?: CriterionKey }[];
  topExpenseCategories: BreakdownEntry[];
}

// ── API payload shapes (shared server ↔ client) ──────────────────────────

export interface ScorePayload {
  score: number;
  tier: string;
  criteria: Criterion[];
}

export interface StatsBreakdownPayload {
  by: BreakdownDimension;
  total: number;
  totalVariation: number | null;
  entries: BreakdownEntry[];
}

export interface SpendModePayload {
  total: number;
  variation: number | null;
  buckets: { label: string; amount: number }[];
  splitA: number; // investment / active
  splitB: number; // consumption / passive
  rising: { label: string; variation: number }[];
}

export interface PatrimoinePayload {
  estimated: number;
  accountsValue: number;
  projectsValue: number;
  accounts: { id: string; name: string; type: string; balance: number }[];
  completedProjects: {
    id: string;
    name: string;
    category: string;
    amount: number;
  }[];
}

export interface StatsPayload {
  mode: string;
  period: string;
  account: { id: string; name: string } | null;
  overview: {
    curve: { date: string; balance: number }[] | null;
    startBalance: number;
    currentBalance: number;
    income: number;
    expenses: number;
    net: number;
    netVariation: number | null;
    passiveIncome: number;
  };
  expenseBreakdown: StatsBreakdownPayload | null;
  incomeBreakdown: StatsBreakdownPayload | null;
  score: ScorePayload | null;
  expenseMode: SpendModePayload | null;
  incomeMode: SpendModePayload | null;
  patrimoine: PatrimoinePayload | null;
}

export interface ReportListPayload {
  periods: { key: string; type: ReportPeriodType }[];
  report: ReportPayload | null;
}

export function buildReport(input: {
  periodKey: string;
  now: Date;
  current: StatTx[];
  previous: StatTx[];
}): ReportPayload {
  const range = reportPeriodRange(input.periodKey);
  const cur = aggregate(input.current);
  const prev = aggregate(input.previous);
  const curScore = computeScore(cur);
  const prevScore = computeScore(prev);

  const criteria: ReportCriterion[] = curScore.criteria.map((c) => {
    const p = prevScore.criteria.find((x) => x.key === c.key);
    return { ...c, delta: p ? round1(c.value - p.value) : null };
  });

  // Projection — % of the way to independence = Liberté Financière value.
  const percent = Math.min(100, pct(cur.passiveIncome, cur.expenses));
  const passiveGrowth = cur.passiveIncome - prev.passiveIncome;
  const remaining = Math.max(0, cur.expenses - cur.passiveIncome);
  let monthsToIndependence: number | null = null;
  let estimatedDate: string | null = null;
  if (percent >= 100) {
    monthsToIndependence = 0;
  } else if (passiveGrowth > 0 && range.type === "monthly") {
    monthsToIndependence = Math.ceil(remaining / passiveGrowth);
    if (monthsToIndependence > 600) monthsToIndependence = null;
    else {
      const d = new Date(range.end + "T00:00:00Z");
      d.setUTCMonth(d.getUTCMonth() + monthsToIndependence);
      estimatedDate = monthKey(d);
    }
  }

  // Strengths — up to 3 positive movements, biggest first.
  const strengthCandidates: { key: string; magnitude: number }[] = [];
  const savingsRate = cur.income > 0 ? (cur.net / cur.income) * 100 : 0;
  const prevSavingsRate = prev.income > 0 ? (prev.net / prev.income) * 100 : 0;
  if (savingsRate - prevSavingsRate >= 1)
    strengthCandidates.push({ key: "savings-up", magnitude: round1(savingsRate - prevSavingsRate) });
  const passiveVar = variation(cur.passiveIncome, prev.passiveIncome);
  if (passiveVar !== null && passiveVar >= 5)
    strengthCandidates.push({ key: "passive-up", magnitude: round1(passiveVar) });
  const consoVar = variation(cur.consumptionExpense, prev.consumptionExpense);
  if (consoVar !== null && consoVar <= -3)
    strengthCandidates.push({ key: "consumption-down", magnitude: round1(Math.abs(consoVar)) });
  const investVar = variation(cur.investmentExpense, prev.investmentExpense);
  if (investVar !== null && investVar >= 5)
    strengthCandidates.push({ key: "investment-up", magnitude: round1(investVar) });
  if (cur.net > 0 && prev.net <= 0)
    strengthCandidates.push({ key: "back-to-positive", magnitude: cur.net });
  const strengths = strengthCandidates
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 3);

  // Priority — the weighted criterion with the largest missing contribution.
  const priorityCriterion = [...criteria].sort(
    (a, b) => b.weight * (100 - b.normalized) - a.weight * (100 - a.normalized),
  )[0]!.key;

  // Advice — one on the priority, then generic openings by band.
  const advice: { key: string; criterion?: CriterionKey }[] = [
    { key: "priority", criterion: priorityCriterion },
  ];
  const epargne = criteria.find((c) => c.key === "epargne")!;
  if (epargne.band !== "low") advice.push({ key: "invest-savings" });
  const invest = criteria.find((c) => c.key === "investissement")!;
  if (invest.band !== "low") advice.push({ key: "keep-investing" });
  if (advice.length < 3) advice.push({ key: "track-daily" });

  return {
    periodKey: input.periodKey,
    periodType: range.type,
    overview: {
      income: cur.income,
      incomeVariation: variation(cur.income, prev.income),
      activeIncome: cur.activeIncome,
      passiveIncome: cur.passiveIncome,
      expenses: cur.expenses,
      expenseVariation: variation(cur.expenses, prev.expenses),
      investmentExpense: cur.investmentExpense,
      consumptionExpense: cur.consumptionExpense,
      net: cur.net,
    },
    score: {
      value: curScore.score,
      tier: curScore.tier,
      delta: input.previous.length > 0 ? curScore.score - prevScore.score : null,
    },
    criteria,
    projection: { percent: round1(percent), monthsToIndependence, estimatedDate },
    strengths,
    priorityCriterion,
    advice: advice.slice(0, 3),
    topExpenseCategories: breakdown(input.current, "expense", "category").slice(0, 5),
  };
}
