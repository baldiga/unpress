"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { StepLayout } from "@/components/step-layout";
import { useWizardState } from "@/hooks/use-wizard-state";
import { Step1InstallPlugin } from "@/components/steps/step1-install-plugin";
import { Step2ConnectWordPress } from "@/components/steps/step2-connect-wordpress";
import { Step3SetupSanity } from "@/components/steps/step3-setup-sanity";
import { Step4SetupGitHub } from "@/components/steps/step4-setup-github";
import { Step5SetupVercel } from "@/components/steps/step5-setup-vercel";
import { Step6DesignInspiration } from "@/components/steps/step6-design-inspiration";
import { Step7ReviewLaunch } from "@/components/steps/step7-review-launch";
import type { SkillLevel } from "@/lib/wizard-types";

function StepPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();

  const stepNum = parseInt(params.step as string, 10);
  const level = (searchParams.get("level") as SkillLevel) || "novice";
  const { state, hydrated, update, markStepComplete, clearTokens } = useWizardState(level);

  if (!hydrated) return null;
  if (stepNum < 1 || stepNum > 7) return <div className="pt-8 text-center">Step not found.</div>;

  const handleComplete = () => {
    markStepComplete(stepNum);
    update({ currentStep: stepNum + 1 });
  };

  const stepProps = { level, state, onUpdate: update, onComplete: handleComplete };

  return (
    <StepLayout step={stepNum} level={level}>
      {stepNum === 1 && <Step1InstallPlugin {...stepProps} />}
      {stepNum === 2 && <Step2ConnectWordPress {...stepProps} />}
      {stepNum === 3 && <Step3SetupSanity {...stepProps} />}
      {stepNum === 4 && <Step4SetupGitHub {...stepProps} />}
      {stepNum === 5 && <Step5SetupVercel {...stepProps} />}
      {stepNum === 6 && <Step6DesignInspiration {...stepProps} />}
      {stepNum === 7 && <Step7ReviewLaunch {...stepProps} onClearTokens={clearTokens} />}
    </StepLayout>
  );
}

export default function StepPage() {
  return (
    <Suspense fallback={<div className="pt-8 text-center text-[#8a7d72]">Loading...</div>}>
      <StepPageInner />
    </Suspense>
  );
}
