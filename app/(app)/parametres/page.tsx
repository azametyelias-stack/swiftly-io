import { SettingsScreen } from "@/components/settings/SettingsScreen";

// SCREEN-22 — Paramètres utilisateur (Lot 6). Reached from the menu's profile
// button (`components/nav/MenuDrawer`), which has pointed here since P4 — until
// this route existed, that button was a 404.
export default function Page() {
  return <SettingsScreen />;
}
