"use client";

import { useState, useCallback, useEffect } from "react";
import type { WizardState, SkillLevel } from "@/lib/wizard-types";
import { INITIAL_STATE } from "@/lib/wizard-types";

const STORAGE_KEY = "unpress-wizard";

function loadState(): WizardState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    return INITIAL_STATE;
  }
}

function saveState(state: WizardState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useWizardState(urlLevel?: SkillLevel) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    // URL level param takes precedence
    if (urlLevel) {
      loaded.level = urlLevel;
    }
    setState(loaded);
    setHydrated(true);
  }, [urlLevel]);

  const update = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      saveState(next);
      return next;
    });
  }, []);

  const markStepComplete = useCallback((step: number) => {
    setState((prev) => {
      const completedSteps = prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step];
      const next = { ...prev, completedSteps };
      saveState(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setState(INITIAL_STATE);
  }, []);

  const clearTokens = useCallback(() => {
    setState((prev) => {
      const next = {
        ...prev,
        wp_auth_token: undefined,
        sanity_token: undefined,
        github_token: undefined,
        vercel_token: undefined,
      };
      saveState(next);
      return next;
    });
  }, []);

  return { state, hydrated, update, markStepComplete, clear, clearTokens };
}
