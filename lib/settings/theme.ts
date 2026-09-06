"use client";

import { useSyncExternalStore } from "react";

import { THEME_COLOR } from "@/lib/pwa/config";

/**
 * The one place that owns `<html data-theme>` and its stored choice.
 *
 * Two things set the theme and they must not disagree: the drawer's quick
 * switch (`components/nav/ThemeToggle`), which cycles Système → Clair → Sombre,
 * and SCREEN-22's "Thème sombre" row, which is a binary because that is what
 * `users.theme` stores ('light' | 'dark') and what the artboard draws ("Le thème
 * est un interrupteur, pas deux boutons"). Both write through here, so flipping
 * one updates the other in the same frame.
 *
 * `system` exists only client-side: it means "no `data-theme` attribute, follow
 * the OS", which `globals.css` handles. It has no `users.theme` equivalent, so
 * SCREEN-22 reads it as whatever the OS currently resolves to.
 */

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "sf-theme";
export const THEME_CHANGE_EVENT = "sf:theme-change";
export const THEME_ORDER: ThemeChoice[] = ["system", "light", "dark"];

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage may be unavailable (private window, blocked site data) */
  }
  return "system";
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  applyThemeColorMeta(resolvedTheme(choice));
}

/**
 * Repoint `<meta name="theme-color">` at the palette now on screen.
 *
 * Installed as a PWA, that meta is the phone's status bar. Left on the light
 * value under a dark app it draws a pale band across the top of a dark screen —
 * the app looks broken before a single figure is read. `THEME_BOOT_SCRIPT`
 * creates the tag pre-paint; this keeps it honest afterwards.
 */
export function applyThemeColorMeta(resolved: "light" | "dark"): void {
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLOR[resolved];
}

/** Persist + apply + notify every subscriber in the tab. */
export function setThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* ignore — the attribute below still applies for this session */
  }
  applyThemeChoice(choice);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeTheme(onChange: () => void): () => void {
  // The OS counts as a source too: under choice "system" the painted theme
  // changes without anything in the app writing a thing.
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener("change", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    media?.removeEventListener("change", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The choice resolved to what is actually painted — "system" asks the OS.
 * Used by SCREEN-22's switch, which has no third position.
 */
export function resolvedTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * The theme currently ON SCREEN, tracked live.
 *
 * SCREEN-22's switch used to read `profile.theme` from the row, which since
 * "system" became storable could say one thing while the app painted another:
 * choice "system" under a dark OS is a dark app and an unchecked switch. A
 * control has to report what is true, so the switch reads what is applied.
 */
export function useAppliedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribeTheme,
    () => resolvedTheme(readThemeChoice()),
    // Server render: the boot script has not run, so assume the light palette
    // the CSS starts on rather than guessing.
    () => "light",
  );
}
