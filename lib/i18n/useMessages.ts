"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_LOCALE,
  getMessages,
  isLocale,
  type Locale,
  type Messages,
} from "./index";

/**
 * Client access to the current locale + message tree. Same idiom as
 * `components/nav/ThemeToggle` (useSyncExternalStore over localStorage, no
 * setState-in-effect, no hydration flash of the wrong language).
 *
 * The locale lives in `localStorage["sf-lang"]`; SCREEN-22 builds the actual
 * language selector on top of `setLocale`. Until then everything is FR.
 */

const STORAGE_KEY = "sf-lang";
const CHANGE_EVENT = "sf:lang-change";

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLocale(v)) return v;
  } catch {
    /* storage may be unavailable */
  }
  return DEFAULT_LOCALE;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);
}

export function useMessages(): Messages {
  return getMessages(useLocale());
}

/** Persist a new locale and notify every `useLocale()` subscriber. */
export function setLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
