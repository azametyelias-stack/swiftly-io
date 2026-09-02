/**
 * Structured logging (SECURITY MASTERPLAN — Point 15: log actions, NEVER secrets).
 *
 * ## Why not `winston` + `winston-daily-rotate-file`
 *
 * The masterplan sketch uses winston with a daily-rotating *file* transport.
 * Swiftly.io runs on Vercel serverless functions: there is no persistent writable
 * filesystem, so a file transport writes logs nowhere retrievable. The
 * platform-native path is **structured JSON on stdout/stderr**, which Vercel
 * captures into its log drains (and which any host — Docker, a Node server —
 * can pipe wherever it wants). Error aggregation + alerting is **Sentry**
 * (`SENTRY_DSN`), wired in the dedicated monitoring session (FEATURES-SCAN
 * "System 5: MONITORING & ALERTING", Day 29).
 *
 * ## What this module guarantees
 *
 * One `log` object. Every record is a single JSON line with a timestamp + level.
 * Every `meta` payload is run through {@link redact} before it is serialised, so
 * a password / token / API key / bearer JWT / raw email can never reach the sink
 * — even when a caller passes one by accident.
 *
 * Pure & dependency-free (only `console`, `Date`, and an optional `LOG_LEVEL`
 * env read): unit-tested in `tests/log/logger.test.ts`, and safe to import from
 * both server and client code.
 */

// ===========================================================================
// Redaction  (Point 15, step 3: maskSensitiveData)
// ===========================================================================

/**
 * Substrings (case-insensitive) that mark a KEY whose value must never be
 * logged. The whole value is replaced with `[REDACTED]`, at any nesting depth.
 */
const DENY_KEY_SUBSTRINGS = [
  "password",
  "passwd",
  "pwd",
  "token", // access_token, refresh_token, id_token, csrf_token, …
  "secret", // client_secret, secret_key, service_role secret, …
  "authorization",
  "auth_token",
  "apikey",
  "api_key",
  "api-key",
  "credential",
  "jwt",
  "cookie", // cookie, set-cookie
  "service_role",
  "anon_key",
  "private_key",
  "privatekey",
  "card_number",
  "cardnumber",
  "cardno",
  "cvv",
  "cvc",
  "ccv",
  "pin",
  "otp",
  "passcode",
] as const;

/** Keys (case-insensitive substring) whose string value should be MASKED, not dropped. */
const EMAIL_KEY = /e[-_]?mail/i;
const PHONE_KEY = /phone|mobile|msisdn|\btel\b/i;

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

/** `elias@swiftly.io` -> `el***@swiftly.io`; short local part -> `***@swiftly.io`. */
export function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at < 1) return value.length <= 3 ? REDACTED : `${value.slice(0, 2)}***`;
  const local = value.slice(0, at);
  const domain = value.slice(at);
  const head = local.length <= 2 ? "" : local.slice(0, 2);
  return `${head}***${domain}`;
}

/** `+228 90 12 34 56` -> `+2***3456` — keep first 2 + last 4, mask the rest. */
export function maskPhone(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.replace(/\D/g, "").length <= 4 || compact.length <= 6) return REDACTED;
  return `${compact.slice(0, 2)}***${compact.slice(-4)}`;
}

function isDenyKey(key: string): boolean {
  const k = key.toLowerCase();
  return DENY_KEY_SUBSTRINGS.some((s) => k.includes(s));
}

/**
 * Scrub secret-shaped substrings out of a free-text string:
 *  - JWTs (`eyJ...` . `...` . `...`)
 *  - provider keys (`sk_`, `pk_`, `rk_`, `whsec_`, `SG.` …)
 *  - long bearer / hex blobs after "bearer " or "token="
 */
export function scrubString(input: string): string {
  return input
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, REDACTED)
    .replace(/\b(?:sk|pk|rk|whsec)_[A-Za-z0-9_]{8,}\b/gi, REDACTED)
    .replace(/\bSG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, REDACTED)
    .replace(/\b(bearer\s+|(?:access_?|refresh_?)?token=)[A-Za-z0-9._-]{12,}/gi, `$1${REDACTED}`);
}

/**
 * Deep-copy `input`, dropping the value of any deny-listed key, masking emails
 * and phone numbers, and scrubbing secret-shaped substrings out of free text.
 * Cycle-safe; bounded depth. Never mutates the input.
 */
export function redact<T>(input: T): T {
  return redactValue(input, 0, new WeakSet<object>()) as T;
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubString(value.message),
      stack: value.stack ? scrubString(value.stack) : undefined,
    };
  }

  if (seen.has(value)) return "[Circular]";
  if (depth >= MAX_DEPTH) return "[Truncated]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, depth + 1, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (isDenyKey(key)) {
      out[key] = REDACTED;
    } else if (typeof v === "string" && EMAIL_KEY.test(key)) {
      out[key] = maskEmail(v);
    } else if (typeof v === "string" && PHONE_KEY.test(key)) {
      out[key] = maskPhone(v);
    } else {
      out[key] = redactValue(v, depth + 1, seen);
    }
  }
  return out;
}

// ===========================================================================
// Logger
// ===========================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogMeta = Record<string, unknown>;

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  const raw =
    typeof process !== "undefined" ? process.env.LOG_LEVEL?.toLowerCase() : undefined;
  return raw && raw in LEVEL_RANK ? LEVEL_RANK[raw as LogLevel] : LEVEL_RANK.info;
}

/** Build the JSON log line. Exported for tests. */
export function formatRecord(level: LogLevel, event: string, meta?: LogMeta): string {
  const record: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
  };
  if (meta && Object.keys(meta).length > 0) {
    record.meta = redact(meta);
  }
  return JSON.stringify(record);
}

function emit(level: LogLevel, event: string, meta?: LogMeta): void {
  if (LEVEL_RANK[level] < threshold()) return;
  const line = formatRecord(level, event, meta);
  const sink =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "debug"
          ? console.debug
          : console.log;
  sink(line);
}

/**
 * The application logger. `event` is a short stable slug (`auth.login_ok`,
 * `security.unauthorized_access_attempt`), `meta` is structured context that is
 * always redacted before it is written.
 *
 *   log.info("auth.login_ok", { userId, email });   // email -> el***@domain
 *   log.warn("security.rate_limited", { ip, endpoint, attempts });
 *   log.error("route.unhandled_error", { err });     // stack scrubbed, no secret
 *
 * NEVER: log.info("...", { password, token, apiKey }) — those keys are dropped
 * anyway, but don't rely on it; pass only what you mean to record.
 */
export const log = {
  debug: (event: string, meta?: LogMeta) => emit("debug", event, meta),
  info: (event: string, meta?: LogMeta) => emit("info", event, meta),
  warn: (event: string, meta?: LogMeta) => emit("warn", event, meta),
  error: (event: string, meta?: LogMeta) => emit("error", event, meta),
};
