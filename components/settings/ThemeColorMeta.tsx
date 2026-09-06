"use client";

import { useEffect } from "react";

import { applyThemeColorMeta, useAppliedTheme } from "@/lib/settings/theme";

/**
 * Keeps `<meta name="theme-color">` on the palette actually painted. Renders
 * nothing.
 *
 * `THEME_BOOT_SCRIPT` writes the tag before the first paint, and
 * `applyThemeChoice` rewrites it whenever the user picks a theme. This covers
 * the third case: choice "system" and the OS flipping under us (sunset, a
 * scheduled dark mode), where nothing in the app wrote anything at all.
 *
 * Why it matters at all: installed as a PWA, that value IS the status bar.
 */
export function ThemeColorMeta() {
  const theme = useAppliedTheme();

  useEffect(() => {
    applyThemeColorMeta(theme);
  }, [theme]);

  return null;
}
