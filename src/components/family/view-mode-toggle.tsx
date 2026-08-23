"use client";

import { useFamily } from "@/lib/family";
import type { ViewMode } from "@/lib/types";
import { MultiTab } from "@/components/ui/multi-tab";

const MODES = [
  { id: "personal", label: "Personal" },
  { id: "family", label: "Family" },
] as const;

/** Only meaningful once a family exists, so it hides itself otherwise. */
export function ViewModeToggle() {
  const { family, mode, setMode } = useFamily();
  if (!family) return null;

  return (
    <MultiTab
      variant="glass"
      items={MODES}
      value={mode}
      onValueChange={(v) => setMode(v as ViewMode)}
      className="max-w-xs"
    />
  );
}
