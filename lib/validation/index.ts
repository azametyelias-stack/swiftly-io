/**
 * Input validation registry — SECURITY MASTERPLAN Point 10 / BUILD-PLAN.md § P2.
 * Routes import schemas + `parseJsonBody` from here.
 */

export * from "@/lib/validation/schemas";
export { parseJsonBody, parseParams } from "@/lib/validation/parse";
