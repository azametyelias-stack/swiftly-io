"use client";

import { createContext, useContext } from "react";

export interface NavShellValue {
  /** Is the menu revealed. */
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

export const NavShellContext = createContext<NavShellValue | null>(null);

export function useNavShell(): NavShellValue {
  const ctx = useContext(NavShellContext);
  if (!ctx) throw new Error("useNavShell must be used within <NavShell>");
  return ctx;
}
