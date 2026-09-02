/**
 * Input validation registry — SECURITY MASTERPLAN Point 10 / BUILD-PLAN.md § P2
 * ("PROMPT #INPUT"). Every `app/api/**` route that accepts a body parses it here
 * via `parseJsonBody` (`./parse.ts`).
 *
 * This file imports only `zod` (so it is unit-testable under `node --test`, like
 * `lib/privacy/schemas.ts`). Do not add cross-module imports here.
 *
 * Field names are snake_case = the DB columns in
 * `supabase/migrations/0002_core_schema.sql`, so `parsed.data` inserts directly.
 * The API is internal (our own screens on both sides).
 *
 * NOT in any input schema (set server-side — Point 6): `user_id`, `id`,
 * `is_primary`, `is_archived`, `usage_count`, `allocated_amount` (projects),
 * `scoring_axis` (resolved at write from the category / "lié à").
 */

import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════════
// Field primitives — one definition of "what is a valid <x>"
// ════════════════════════════════════════════════════════════════════════════

/** Amount in whole XOF francs (DESIGN-RECONCILIATION.md D1). Strictly positive. */
export const amount = z
  .number({ error: "Montant requis." })
  .int("Le montant doit être un nombre entier de francs.")
  .positive("Le montant doit être supérieur à 0.")
  .max(1_000_000_000_000, "Montant trop élevé.");

/** Amount that may be zero (e.g. an account's initial balance). */
export const amountOrZero = z
  .number({ error: "Montant requis." })
  .int("Le montant doit être un nombre entier de francs.")
  .min(0, "Le montant ne peut pas être négatif.")
  .max(1_000_000_000_000, "Montant trop élevé.");

export const currency = z.enum(["XOF", "EUR", "USD"], {
  error: "Devise non prise en charge.",
});

export const uuid = z.uuid("Identifiant invalide.");

/** Calendar day `YYYY-MM-DD` that is also a real date. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (attendu AAAA-MM-JJ).")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && s === d.toISOString().slice(0, 10);
  }, "Date invalide.");

/** Free-text note on a transaction / template (SCREEN-8/9: max 500). */
export const note = z
  .string()
  .trim()
  .max(500, "La note ne peut pas dépasser 500 caractères.");

/** A short required label (account / project / person / category name…). */
export const shortLabel = z
  .string()
  .trim()
  .min(1, "Ce champ est requis.")
  .max(120, "120 caractères maximum.");

/** A name of at least 2 characters (user name — SCREEN-3). */
export const personName = z
  .string()
  .trim()
  .min(2, "Au moins 2 caractères.")
  .max(120, "120 caractères maximum.");

export const description = z.string().trim().max(500, "500 caractères maximum.");

export const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale invalide (ex. #152BC7).");

// enums mirroring the DB CHECK constraints
export const accountType = z.enum(["cash", "mobile", "bank", "card"], {
  error: "Type de compte invalide.",
});
export const feeType = z.enum(["fixed", "percent"]);
export const categoryKind = z.enum(["expense", "income"], {
  error: "Type de catégorie invalide.",
});
export const scoringAxis = z.enum([
  "investment",
  "consumption",
  "active",
  "passive",
]);
export const recurrence = z.enum(["once", "daily", "monthly"], {
  error: "Fréquence invalide.",
});
export const linkedToType = z.enum(["person", "project"], {
  error: "Type de lien invalide.",
});
export const projectStatus = z.enum(["active", "done", "paused", "onhold"], {
  error: "Statut de projet invalide.",
});
export const theme = z.enum(["light", "dark"]);
export const language = z.enum(["fr", "en"]);

// ════════════════════════════════════════════════════════════════════════════
// Entity schemas
// ════════════════════════════════════════════════════════════════════════════

// ── accounts (SCREEN-17) ────────────────────────────────────────────────────
const accountShape = {
  name: shortLabel,
  type: accountType,
  initial_balance: amountOrZero.default(0),
  currency: currency.default("XOF"),
  provider: shortLabel.nullish(),
  card_network: shortLabel.nullish(),
  account_number: z.string().trim().max(64).nullish(),
  monthly_fee: amountOrZero.nullish(),
  fee_type: feeType.nullish(),
  is_favorite: z.boolean().default(false),
  notes: description.nullish(),
};

const feeConsistent = (v: { monthly_fee?: unknown; fee_type?: unknown }) =>
  (v.monthly_fee == null) === (v.fee_type == null);

export const accountCreateSchema = z
  .object(accountShape)
  .strict()
  .refine(feeConsistent, {
    message:
      "Renseignez le montant et le type de frais ensemble, ou aucun des deux.",
    path: ["monthly_fee"],
  });

export const accountUpdateSchema = z.object(accountShape).partial().strict();

// ── people ("Lié à" — person side) ──────────────────────────────────────────
export const personCreateSchema = z.object({ name: shortLabel }).strict();

// ── categories (user-defined) ───────────────────────────────────────────────
export const categoryCreateSchema = z
  .object({
    name: shortLabel,
    kind: categoryKind,
    color: hexColor,
    axis: scoringAxis.nullish(),
  })
  .strict();

export const categoryUpdateSchema = categoryCreateSchema.partial();

// ── transactions (SCREEN-8/9/10) ────────────────────────────────────────────
const expenseTx = z
  .object({
    type: z.literal("expense"),
    amount,
    occurred_on: isoDate.optional(),
    source_account_id: uuid,
    category_id: uuid.nullish(),
    linked_to_type: linkedToType.nullish(),
    linked_to_id: uuid.nullish(),
    note: note.optional(),
    status: z.enum(["done", "planned", "refunded"]).default("done"),
    recurrence: recurrence.default("once"),
  })
  .strict();

const incomeTx = z
  .object({
    type: z.literal("income"),
    amount,
    occurred_on: isoDate.optional(),
    destination_account_id: uuid,
    category_id: uuid, // required for income (SCREEN-9)
    linked_to_type: linkedToType, // required for income (SCREEN-9)
    linked_to_id: uuid,
    note: note.optional(),
    status: z.enum(["done", "planned", "received"]).default("done"),
    recurrence: recurrence.default("once"),
  })
  .strict();

const transferTx = z
  .object({
    type: z.literal("transfer"),
    amount,
    occurred_on: isoDate.optional(),
    source_account_id: uuid,
    destination_account_id: uuid,
    note: note.optional(),
  })
  .strict();

export const transactionCreateSchema = z
  .discriminatedUnion("type", [expenseTx, incomeTx, transferTx])
  .superRefine((val, ctx) => {
    if (
      val.type === "transfer" &&
      val.source_account_id === val.destination_account_id
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Le compte source et le compte destination doivent être différents.",
        path: ["destination_account_id"],
      });
    }
    if (
      val.type === "expense" &&
      (val.linked_to_type == null) !== (val.linked_to_id == null)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "« Lié à » incomplet.",
        path: ["linked_to_id"],
      });
    }
  });

/** Edit reuses the create shape; the route also checks ownership of the row. */
export const transactionUpdateSchema = transactionCreateSchema;

// ── templates (SCREEN-14) — the recurrence toggle lives here (D2bis) ─────────
export const templateCreateSchema = z
  .object({
    name: shortLabel,
    description: description.default(""),
    kind: categoryKind,
    amount,
    category_id: uuid.nullish(),
    linked_to_type: linkedToType.nullish(),
    linked_to_id: uuid.nullish(),
    account_id: uuid.nullish(),
    recurrence: recurrence.default("once"),
    is_favorite: z.boolean().default(false),
  })
  .strict()
  .refine((v) => (v.linked_to_type == null) === (v.linked_to_id == null), {
    message: "« Lié à » incomplet.",
    path: ["linked_to_id"],
  });

export const templateUpdateSchema = z
  .object({
    name: shortLabel.optional(),
    description: description.optional(),
    amount: amount.optional(),
    category_id: uuid.nullish(),
    linked_to_type: linkedToType.nullish(),
    linked_to_id: uuid.nullish(),
    account_id: uuid.nullish(),
    recurrence: recurrence.optional(),
    is_favorite: z.boolean().optional(),
  })
  .strict();

// ── budgets (SCREEN-15) — monthly, one per category ─────────────────────────
export const budgetCreateSchema = z
  .object({
    category_id: uuid,
    allocated_amount: amount,
    is_favorite: z.boolean().default(false),
  })
  .strict();

export const budgetUpdateSchema = z
  .object({
    allocated_amount: amount.optional(),
    is_favorite: z.boolean().optional(),
  })
  .strict();

// ── projects (SCREEN-16) ────────────────────────────────────────────────────
export const projectCreateSchema = z
  .object({
    name: shortLabel,
    description: description.default(""),
    category: shortLabel.default("other"),
    target_amount: amount.nullish(), // null = no progress bar
    start_date: isoDate.nullish(),
    end_date: isoDate.nullish(),
    status: projectStatus.default("active"),
    account_id: uuid.nullish(), // null = primary account
    is_favorite: z.boolean().default(false),
  })
  .strict();

export const projectUpdateSchema = projectCreateSchema.partial();

/** "Affecter au solde" — moves money in/out of a project without a transaction (D4). */
export const projectAllocateSchema = z
  .object({ amount, direction: z.enum(["add", "withdraw"]).default("add") })
  .strict();

// ── user profile ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/profile (SCREEN-3) — completes the row after the invite code is
 * redeemed. `name` is REQUIRED here (unlike the settings update below, where
 * every field is optional). The screen doc calls the field "username"; we store
 * it as `users.name`.
 */
export const profileCreateSchema = z.object({ name: personName }).strict();

// ── user profile (SCREEN-22 settings) — email is not editable ───────────────
export const profileUpdateSchema = z
  .object({
    name: personName.optional(),
    preferred_currency: currency.optional(),
    theme: theme.optional(),
    language: language.optional(),
    avatar_url: z.url("URL invalide.").nullish(),
  })
  .strict();

// ── inferred types ─────────────────────────────────────────────────────────
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type PersonCreateInput = z.infer<typeof personCreateSchema>;
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectAllocateInput = z.infer<typeof projectAllocateSchema>;
export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
