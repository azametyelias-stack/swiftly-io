import { test } from "node:test";
import assert from "node:assert/strict";

import {
  NAV_ITEMS,
  ROOT_PATHS,
  activeNavItem,
  isRootPath,
} from "../../lib/nav/items.ts";

test("the menu has ~10 unique entries with unique routes (SCREEN-05)", () => {
  assert.ok(NAV_ITEMS.length >= 9 && NAV_ITEMS.length <= 11);
  assert.equal(new Set(NAV_ITEMS.map((i) => i.id)).size, NAV_ITEMS.length);
  assert.equal(new Set(NAV_ITEMS.map((i) => i.href)).size, NAV_ITEMS.length);
  for (const item of NAV_ITEMS) assert.match(item.href, /^\/[a-z]+$/);
});

test("Dashboard is first; the sections the reconciliation lists are all present", () => {
  assert.equal(NAV_ITEMS[0].id, "dashboard");
  const labels = NAV_ITEMS.map((i) => i.label);
  for (const l of ["Dashboard", "Statistiques", "Templates", "Budgets", "Historiques", "Aides", "Rapport"]) {
    assert.ok(labels.includes(l), `missing ${l}`);
  }
});

test("isRootPath: a section route is root, a deeper path is a sub-screen", () => {
  assert.equal(isRootPath("/dashboard"), true);
  assert.equal(isRootPath("/historiques"), true);
  assert.equal(isRootPath("/historiques/"), true); // trailing slash
  assert.equal(isRootPath("/historiques/tx_123"), false);
  assert.equal(isRootPath("/comptes/nouveau"), false);
  assert.equal(isRootPath("/"), false);
  assert.equal(isRootPath("/privacy"), false);
});

test("ROOT_PATHS mirrors the item hrefs", () => {
  assert.deepEqual([...ROOT_PATHS].sort(), NAV_ITEMS.map((i) => i.href).sort());
});

test("activeNavItem: exact match and longest-prefix match", () => {
  assert.equal(activeNavItem("/dashboard")?.id, "dashboard");
  assert.equal(activeNavItem("/historiques/tx_123")?.id, "history");
  assert.equal(activeNavItem("/comptes/nouveau")?.id, "accounts");
  assert.equal(activeNavItem("/"), null);
  assert.equal(activeNavItem("/settings"), null);
});
