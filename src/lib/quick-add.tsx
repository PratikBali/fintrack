"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type QuickAddAction =
  | { label: string; run: () => void }
  | { hidden: true }
  | null;

const QuickAddContext = createContext<{
  action: QuickAddAction;
  setAction: (a: QuickAddAction) => void;
}>({ action: null, setAction: () => {} });

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<QuickAddAction>(null);
  return (
    <QuickAddContext.Provider value={{ action, setAction }}>
      {children}
    </QuickAddContext.Provider>
  );
}

/** Read by the global +/Add buttons to know what the current tab should add. */
export function useQuickAddAction() {
  return useContext(QuickAddContext).action;
}

/**
 * A mounted view owns the global add button while it's active. `run` MUST be
 * stable (wrap in useCallback) or this re-registers every render. Pass
 * `enabled: false` for a read-only view — the button hides instead.
 */
export function useRegisterQuickAdd(
  label: string,
  run: () => void,
  enabled = true
) {
  const { setAction } = useContext(QuickAddContext);
  useEffect(() => {
    setAction(enabled ? { label, run } : { hidden: true });
    return () => setAction(null);
  }, [label, run, setAction, enabled]);
}

/** Hides the global add button while this view is mounted (e.g. Reports). */
export function useHideQuickAdd() {
  const { setAction } = useContext(QuickAddContext);
  useEffect(() => {
    setAction({ hidden: true });
    return () => setAction(null);
  }, [setAction]);
}
