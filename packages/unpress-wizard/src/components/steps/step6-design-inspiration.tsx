"use client";

import { useState } from "react";
import { InputField } from "@/components/input-field";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";
import Link from "next/link";

interface Step6Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

const PRIVATE_PATTERNS = /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|169\.254\.)/i;

export function Step6DesignInspiration({ level, state, onUpdate, onComplete }: Step6Props) {
  const [urls, setUrls] = useState<string[]>(state.inspiration_urls || ["", "", "", "", ""]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const updateUrl = (index: number, value: string) => {
    const next = [...urls];
    next[index] = value;
    setUrls(next);
    setSaved(false);
  };

  const handleContinue = () => {
    const filled = urls.filter((u) => u.trim() !== "");

    if (filled.length < 3) {
      setError("Please enter at least 3 website URLs.");
      return;
    }

    for (const url of filled) {
      if (!url.startsWith("https://")) {
        setError(`URLs must start with https:// — check: ${url}`);
        return;
      }
      if (PRIVATE_PATTERNS.test(url)) {
        setError(`Private/local URLs are not allowed: ${url}`);
        return;
      }
    }

    setError("");
    onUpdate({ inspiration_urls: filled });
    onComplete();
    setSaved(true);
  };

  const filledCount = urls.filter((u) => u.trim() !== "").length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#e8ddd3] p-6">
        <h3 className="text-sm font-semibold mb-1">🎨 Share your taste</h3>
        <p className="text-sm text-[#6b6058] leading-relaxed mb-6">
          Share 3–5 websites whose design you love. We&apos;ll analyze their visual DNA — colors,
          fonts, layout, vibe — and create something that matches your taste. Not a generic template.
        </p>

        <div className="space-y-3">
          {urls.map((url, i) => (
            <InputField
              key={i}
              label={`Website ${i + 1}${i < 3 ? "" : " (optional)"}`}
              value={url}
              onChange={(v) => updateUrl(i, v)}
              placeholder="https://example.com"
              type="url"
              required={i < 3}
            />
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#fef2f2] border border-[#ef4444] rounded-xl text-sm text-[#991b1b] flex items-start gap-2">
            <span>❌</span> {error}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!saved && (
          <button
            onClick={handleContinue}
            disabled={filledCount < 3}
            className="px-6 py-3 bg-[#D4603A] text-white rounded-xl font-semibold text-sm hover:bg-[#b8502f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save & Continue →
          </button>
        )}
        {saved && (
          <Link
            href={`/step/7?level=${level}`}
            className="px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold text-sm hover:bg-[#16a34a] transition-colors"
          >
            Continue →
          </Link>
        )}
      </div>
    </div>
  );
}
