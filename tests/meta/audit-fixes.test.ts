import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Audit 2026-09-05, points 5 and 6.
 *
 * Both bugs were failure paths, not logic: a rejected fetch swallowed by an
 * empty catch, and a database constraint reaching the user as a generic 500.
 * Neither is reachable from a pure function, and both are the kind of thing
 * that quietly comes back the next time someone tidies an error handler — so
 * they are pinned here at the source level, which is the layer where they were
 * wrong.
 */

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

/**
 * Source with `//` lines dropped. These assertions are about what the code
 * DOES, and a comment quoting the old bug ("this used to be `.catch(() => {})`")
 * is not a reoccurrence of it.
 */
const code = (rel: string) =>
  read(rel)
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
    .join("\n");

// ---------------------------------------------------------------------------
// Point 5 — the wizard must say why it cannot be used
// ---------------------------------------------------------------------------

test("a failed account load is reported, not swallowed", () => {
  const hook = code("lib/transactions/useTxRefData.ts");
  assert.doesNotMatch(
    hook,
    /\.catch\(\(\) => \{\}\)/,
    "an empty catch here left the wizard with an empty account grid and no reason",
  );
  assert.match(hook, /setAccountsStatus\("error"\)/);
  assert.match(hook, /accountsStatus: "loading" \| "ready" \| "error"/);
});

test("retrying resets the status instead of leaving it stuck on error", () => {
  // Without this the panel keeps showing the error while the refetch runs, and
  // a successful retry is the only thing that clears it — so a second failure
  // looks identical to no reaction at all.
  const hook = read("lib/transactions/useTxRefData.ts");
  const reload = hook.slice(hook.indexOf("const reloadAccounts"));
  assert.match(reload.slice(0, 200), /setAccountsStatus\("loading"\)/);
});

test("the wizard renders the reason and a way out", () => {
  const wizard = read("components/transactions/TxWizard.tsx");
  assert.match(wizard, /ref\.accountsStatus === "error"/);
  assert.match(wizard, /t\.errors\.accountsFailed/);
  assert.match(wizard, /onClick=\{ref\.reloadAccounts\}/, "the message needs a retry");
});

test("both locales carry the new strings", () => {
  // A missing key renders `undefined` — an error panel with no error in it.
  for (const locale of ["fr", "en"]) {
    const src = read(`lib/i18n/${locale}.ts`);
    assert.match(src, /accountsFailed:/, `${locale} is missing accountsFailed`);
    assert.match(src, /accountsFailedHint:/, `${locale} is missing accountsFailedHint`);
  }
});

// ---------------------------------------------------------------------------
// Point 6 — a duplicate budget must be prevented, then explained
// ---------------------------------------------------------------------------

test("the edit sheet is told which categories are taken", () => {
  const screen = code("components/budgets/BudgetDetailScreen.tsx");
  assert.match(screen, /usedCategoryIds=\{data\.usedCategoryIds\}/);
  assert.doesNotMatch(
    screen,
    /usedCategoryIds=\{\[\]\}/,
    "an empty list let the form offer a pick the database would refuse",
  );
});

test("the used-category list excludes the budget being edited", () => {
  // Otherwise the sheet opens with its own current category filtered out of
  // the picker — the value it is showing would be missing from the options.
  const service = read("lib/budgets/service.ts");
  const getBudget = service.slice(
    service.indexOf("export async function getBudget"),
    service.indexOf("export async function updateBudget"),
  );
  assert.match(getBudget, /\.neq\("id", id\)/);
  assert.match(getBudget, /usedCategoryIds:/);
});

test("both write paths translate the unique violation", () => {
  // The constraint is `unique (user_id, category_id)`. Create translated it;
  // update did not, so the same collision surfaced as an opaque 500.
  const service = read("lib/budgets/service.ts");
  for (const fn of ["createBudget", "updateBudget"]) {
    const start = service.indexOf(`export async function ${fn}`);
    assert.ok(start > 0, `${fn} not found`);
    const body = service.slice(start, start + 1400);
    assert.match(body, /UNIQUE_VIOLATION/, `${fn} must handle 23505`);
    assert.match(
      body,
      /Un budget existe déjà pour cette catégorie\./,
      `${fn} must say what actually happened`,
    );
  }
});

test("the constraint the code relies on is really in the schema", () => {
  // If it ever goes away the guard above becomes dead code and duplicates
  // start being written silently.
  assert.match(
    read("supabase/migrations/0002_core_schema.sql"),
    /unique \(user_id, category_id\)/,
  );
});
