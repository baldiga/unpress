"use client";

import Link from "next/link";
import { STEPS } from "@/lib/wizard-types";
import type { SkillLevel } from "@/lib/wizard-types";

interface StepLayoutProps {
  step: number;
  level: SkillLevel;
  children: React.ReactNode;
}

export function StepLayout({ step, level, children }: StepLayoutProps) {
  const meta = STEPS[step - 1];
  if (!meta) return null;

  return (
    <div className="space-y-6 pt-4">
      {/* Progress Overview */}
      <div className="flex items-center gap-1 p-4 bg-white rounded-xl border border-[#e8ddd3] overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-1">
            <div className={`flex items-center gap-1 text-[11px] font-medium whitespace-nowrap ${
              s.number === step ? "text-[#D4603A] font-bold" : "text-[#bbb0a3]"
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                s.number === step
                  ? "bg-[#D4603A] text-white"
                  : "bg-[#e8ddd3] text-[#8a7d72]"
              }`}>{s.number}</span>
              <span className="hidden sm:inline">{s.title}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-4 h-px bg-[#e0d6cb] mx-0.5 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Meta Bar */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-[#e8ddd3]">
          <span>⏱️</span>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#8a7d72] font-semibold">Est. Time</div>
            <div className="text-sm font-semibold">{meta.estimatedTime}</div>
          </div>
        </div>
      </div>

      {/* Step Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#D4603A] font-semibold mb-2">
          Step {step} of 7
        </p>
        <h1 className="text-3xl font-bold tracking-tight leading-tight mb-2">
          {meta.title}
        </h1>
        <p className="text-[#6b6058] text-base leading-relaxed">
          {meta.description}
        </p>
      </div>

      {/* Step Content */}
      {children}

      {/* Back Navigation */}
      {step > 1 && (
        <div className="pt-4">
          <Link
            href={`/step/${step - 1}?level=${level}`}
            className="text-sm text-[#8a7d72] hover:text-[#D4603A] transition-colors"
          >
            ← Back to Step {step - 1}
          </Link>
        </div>
      )}
    </div>
  );
}
