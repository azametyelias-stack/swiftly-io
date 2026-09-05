import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertOwnership } from "@/lib/auth/guard";
import type { AuthUser } from "@/lib/auth/authenticate";
import { BadRequestError, NotFoundError } from "@/lib/http/errors";
import { todayISO } from "@/lib/format/date";
import { firstOfMonth } from "@/lib/recurrence/model";
import type { BudgetListItem } from "@/lib/budgets/model";
import type {
  BudgetCreateInput,
  BudgetUpdateInput,
} from "@/lib/validation/schemas";

/**
 * Server-side budget reads/writes (SCREEN-15). One budget per category
 * (DB unique). "Dépensé" is computed live from this month's settled expenses.
 */

export type { BudgetListItem } from "@/lib/budgets/model";

const UNIQUE_VIOLATION = "23505";

async function monthlySpendByCategory(
  db: SupabaseClient,
  userId: string,
): Promise<Map<string, { spent: number; count: number }>> {
  const monthStart = firstOfMonth(todayISO());
  const { data } = await db
    .from("transactions")
    .select("amount, category_id")
    .eq("user_id", userId)
    .eq("type", "expense")
    .eq("status", "done")
    .gte("occurred_on", monthStart);
  const out = new Map<string, { spent: number; count: number }>();
  for (const r of data ?? []) {
    if (!r.category_id) continue;
    const cur = out.get(r.category_id) ?? { spent: 0, count: 0 };
    cur.spent += Number(r.amount);
    cur.count += 1;
    out.set(r.category_id, cur);
  }
  return out;
}

async function verifyExpenseCategory(
  db: SupabaseClient,
  userId: string,
  categoryId: string,
): Promise<void> {
  const { data } = await db
    .from("categories")
    .select("id, kind, user_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (!data || (data.user_id !== null && data.user_id !== userId)) {
    throw new NotFoundError("Catégorie introuvable.");
  }
  if (data.kind !== "expense") {
    throw new BadRequestError("Un budget porte sur une catégorie de dépense.");
  }
}

export async function listBudgets(
  db: SupabaseClient,
  userId: string,
): Promise<BudgetListItem[]> {
  const { data, error } = await db
    .from("budgets")
    .select(
      "id, allocated_amount, is_favorite, created_at, category:categories!budgets_category_id_fkey(id, name, color)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const spend = await monthlySpendByCategory(db, userId);
  return (data ?? []).map((raw) => {
    const cat = (
      Array.isArray(raw.category) ? raw.category[0] : raw.category
    ) as { id: string; name: string; color: string };
    const s = spend.get(cat?.id) ?? { spent: 0, count: 0 };
    return {
      id: raw.id as string,
      category: {
        id: cat?.id ?? "",
        name: cat?.name ?? "",
        color: cat?.color ?? "#8A8C93",
      },
      allocated_amount: Number(raw.allocated_amount),
      spent: s.spent,
      is_favorite: Boolean(raw.is_favorite),
      tx_count: s.count,
      created_at: raw.created_at as string,
    };
  });
}

export async function getBudget(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<{
  budget: BudgetListItem;
  transactions: {
    id: string;
    amount: number;
    occurred_on: string;
    note: string | null;
  }[];
  /**
   * Categories already spoken for by the caller's OTHER budgets.
   *
   * `budgets` is UNIQUE (user_id, category_id), and the edit sheet has to know
   * that before it offers a category — otherwise the pick is accepted, the
   * database refuses it, and the user gets an error for a choice the form let
   * them make. Returned here rather than fetched separately so the sheet needs
   * one round trip, not two.
   */
  usedCategoryIds: string[];
}> {
  const { data, error } = await db
    .from("budgets")
    .select(
      "id, allocated_amount, is_favorite, created_at, user_id, category:categories!budgets_category_id_fkey(id, name, color)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  assertOwnership(data as { user_id?: string | null } | null, user, {
    resource: "budget",
    resourceId: id,
  });

  const cat = (
    Array.isArray(data!.category) ? data!.category[0] : data!.category
  ) as { id: string; name: string; color: string };
  const monthStart = firstOfMonth(todayISO());
  const { data: txs } = await db
    .from("transactions")
    .select("id, amount, occurred_on, note")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .eq("status", "done")
    .eq("category_id", cat.id)
    .gte("occurred_on", monthStart)
    .order("occurred_on", { ascending: false });

  const rows = (txs ?? []).map((r) => ({
    id: r.id as string,
    amount: Number(r.amount),
    occurred_on: r.occurred_on as string,
    note: (r.note as string | null) ?? null,
  }));
  const spent = rows.reduce((s, r) => s + r.amount, 0);

  // Excludes this budget's own category: re-picking it is not a duplicate, and
  // hiding it would make the sheet open with its own value missing.
  const { data: others } = await db
    .from("budgets")
    .select("category_id")
    .eq("user_id", user.id)
    .neq("id", id);

  return {
    usedCategoryIds: (others ?? []).map((r) => r.category_id as string),
    budget: {
      id: data!.id as string,
      category: { id: cat.id, name: cat.name, color: cat.color },
      allocated_amount: Number(data!.allocated_amount),
      spent,
      is_favorite: Boolean(data!.is_favorite),
      tx_count: rows.length,
      created_at: data!.created_at as string,
    },
    transactions: rows,
  };
}

export async function createBudget(
  db: SupabaseClient,
  userId: string,
  input: BudgetCreateInput,
): Promise<{ id: string }> {
  await verifyExpenseCategory(db, userId, input.category_id);
  const { data, error } = await db
    .from("budgets")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new BadRequestError("Un budget existe déjà pour cette catégorie.");
    }
    throw error;
  }
  return { id: data.id as string };
}

export async function updateBudget(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
  input: BudgetUpdateInput,
): Promise<void> {
  const { data } = await db
    .from("budgets")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "budget", resourceId: id });
  const { error } = await db
    .from("budgets")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    // `createBudget` has always translated this; the update path did not, so
    // moving a budget onto a category that already has one surfaced the raw
    // constraint failure as a generic 500 — "Une erreur est survenue" for a
    // situation the user can actually fix.
    if (error.code === UNIQUE_VIOLATION) {
      throw new BadRequestError("Un budget existe déjà pour cette catégorie.");
    }
    throw error;
  }
}

export async function deleteBudget(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<void> {
  const { data } = await db
    .from("budgets")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "budget", resourceId: id });
  const { error } = await db
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}
