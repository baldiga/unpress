"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { STEPS, LEVEL_META } from "@/lib/wizard-types";
import type { SkillLevel } from "@/lib/wizard-types";

function NavBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const level = (searchParams.get("level") as SkillLevel) || "novice";
  const levelMeta = LEVEL_META[level] || LEVEL_META.novice;

  // Parse current step from pathname: /step/3 → 3, / → 0
  const stepMatch = pathname.match(/^\/step\/(\d+)$/);
  const currentStep = stepMatch ? parseInt(stepMatch[1], 10) : 0;

  // Read completed steps from localStorage (client-side only)
  let completedSteps: number[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("unpress-wizard");
      if (raw) {
        const parsed = JSON.parse(raw);
        completedSteps = parsed.completedSteps || [];
      }
    } catch { /* ignore */ }
  }

  return (
    <nav className="flex items-center justify-between px-12 py-5 max-w-5xl mx-auto">
      <Link href="/" className="text-2xl font-bold tracking-tight">
        <span className="text-[#D4603A]">Un</span>press
      </Link>

      {/* Step Dots */}
      <div className="flex items-center gap-2">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = step.number === currentStep;

          return (
            <div
              key={step.number}
              className={`h-2.5 rounded-full transition-all ${
                isCompleted
                  ? "w-2.5 bg-[#2d8a56]"
                  : isCurrent
                  ? "w-8 bg-[#D4603A]"
                  : "w-2.5 bg-[#d4c5b5]"
              }`}
            />
          );
        })}
      </div>

      {/* Skill Badge */}
      <div className="bg-white px-3.5 py-1.5 rounded-full text-xs font-medium text-[#D4603A] border border-[#e8ddd3]">
        {levelMeta.icon} {levelMeta.label}
      </div>
    </nav>
  );
}

export function NavBar() {
  return (
    <Suspense fallback={
      <nav className="flex items-center justify-between px-12 py-5 max-w-5xl mx-auto">
        <div className="text-2xl font-bold tracking-tight">
          <span className="text-[#D4603A]">Un</span>press
        </div>
        <div className="flex items-center gap-2" />
        <div className="bg-white px-3.5 py-1.5 rounded-full text-xs font-medium text-[#D4603A] border border-[#e8ddd3]">
          🌱 Novice
        </div>
      </nav>
    }>
      <NavBarInner />
    </Suspense>
  );
}
