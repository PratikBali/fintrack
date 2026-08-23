"use client";

import { User, Users } from "lucide-react";

import { useFamily } from "@/lib/family";
import { cn } from "@/lib/utils";

/** Icon + tiny label beside the avatar. Hidden until a family exists. */
export function ViewModeButton() {
  const { family, mode, setMode } = useFamily();
  if (!family) return null;

  const isFamily = mode === "family";
  const next = isFamily ? "personal" : "family";
  const label = isFamily ? "Family" : "Personal";
  const Icon = isFamily ? Users : User;

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={
        isFamily ? "Switch to personal view" : "Switch to family view"
      }
      title={isFamily ? "Family mode — tap for personal" : "Personal mode — tap for family"}
      className="flex shrink-0 flex-col items-center gap-0.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          isFamily
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span
        className={cn(
          "max-w-[3.25rem] truncate text-[10px] font-medium leading-none",
          isFamily ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </button>
  );
}
