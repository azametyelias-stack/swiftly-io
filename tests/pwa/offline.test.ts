import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../../app/offline/page.tsx", import.meta.url)),
  "utf8",
);

/*
 * The offline page is displayed exactly when the network is gone, which is also
 * when Next's hashed chunks and stylesheet may be missing from the cache. These
 * checks guard the two properties that keep it renderable in that state.
 */

test("the offline page is a Server Component (no hydration required)", () => {
  assert.ok(!/^\s*["']use client["']/m.test(source), "offline page must not be a client component");
});

test("the offline page carries its own styles, not a hashed stylesheet", () => {
  assert.match(source, /<style>\{OFFLINE_CSS\}<\/style>/);
  assert.ok(!source.includes("import \""), "no CSS import — globals.css may not be cached");
});

test("retry works without JavaScript", () => {
  assert.match(source, /href="\/"/, "the retry control must be a real link");
});

test("the offline page sits above the consent and install sheets", () => {
  // Caught in review: at the layout's own stacking level the root <ConsentBanner>
  // (z-50) covered the whole page and the user saw a bare navy screen with a
  // privacy sheet on it. Offline is a system state — it owns the viewport.
  const zIndex = /\.sf-offline\{[^}]*z-index:\s*(\d+)/.exec(source)?.[1];
  assert.ok(zIndex, ".sf-offline must declare a z-index");
  assert.ok(Number(zIndex) > 50, `z-index ${zIndex} must beat the consent sheet (50)`);
});
