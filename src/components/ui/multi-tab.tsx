"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiTabVariant = "primary" | "secondary" | "tertiary";

export interface MultiTabItem {
  id: string;
  label: string;
  /** Only rendered for variant="primary". */
  icon?: LucideIcon;
}

export interface MultiTabProps {
  items: readonly MultiTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  /** primary = icons + rich color + animation. secondary = rich color + animation, no icons. tertiary = flat, no icons, no animation. */
  variant?: MultiTabVariant;
  /** Tailwind classes applied to the selected tab (background/text/border). Falls back to a variant-specific default. */
  selectedColor?: string;
  className?: string;
}

const DEFAULT_SELECTED_COLOR: Record<MultiTabVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-md shadow-primary/30",
  secondary: "bg-indigo-600 text-white shadow-sm",
  tertiary: "text-foreground border-primary",
};

const CONTAINER_CLASS: Record<MultiTabVariant, string> = {
  primary: "grid w-full gap-1.5 rounded-2xl bg-muted/70 p-1.5 shadow-inner",
  secondary: "grid w-full gap-1 rounded-full border bg-muted/40 p-1",
  tertiary: "flex w-full border-b",
};

const TAB_BASE_CLASS: Record<MultiTabVariant, string> = {
  primary:
    "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-tight text-muted-foreground transition-all duration-200 ease-out hover:text-foreground sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-sm",
  secondary:
    "flex items-center justify-center rounded-full px-2 py-2 text-center text-[11px] font-semibold leading-tight text-muted-foreground transition-all duration-200 ease-out hover:text-foreground sm:px-3 sm:text-sm",
  tertiary:
    "flex flex-1 items-center justify-center border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:text-sm",
};

export function MultiTab({
  items,
  value,
  onValueChange,
  variant = "primary",
  selectedColor,
  className,
}: MultiTabProps) {
  const activeColor = selectedColor ?? DEFAULT_SELECTED_COLOR[variant];

  return (
    <div
      role="tablist"
      className={cn(
        CONTAINER_CLASS[variant],
        variant !== "tertiary" && `grid-cols-${items.length}`,
        className
      )}
      style={
        variant !== "tertiary"
          ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange(item.id)}
            className={cn(
              TAB_BASE_CLASS[variant],
              selected
                ? variant === "primary"
                  ? cn(activeColor, "scale-[1.02]")
                  : activeColor
                : ""
            )}
          >
            {variant === "primary" && item.icon ? (
              <item.icon className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" />
            ) : null}
            <span
              className={variant === "secondary" ? "leading-tight" : "truncate"}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
