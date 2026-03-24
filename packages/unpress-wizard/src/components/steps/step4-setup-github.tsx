"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step4Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step4SetupGitHub({ level, state, onUpdate, onComplete }: Step4Props) {
  const handleVerify = async () => {
    if (!state.github_token) return { ok: false, message: "Please enter your GitHub token." };

    try {
      const res = await fetch("/api/verify/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.github_token }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ github_verified: true, github_username: data.data.username });
        onComplete();
        return { ok: true, message: `Connected as @${data.data.username}!` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Could not connect to GitHub." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to <a href='https://github.com/settings/tokens' target='_blank' rel='noopener' class='text-[#D4603A] underline'>github.com/settings/tokens</a> (sign up if you don&apos;t have an account)",
          "Click <strong>&quot;Generate new token (classic)&quot;</strong>",
          "Give it a name like <strong>&quot;Unpress Migration&quot;</strong>",
          "Select scopes: <strong>repo</strong> and <strong>workflow</strong>",
          "Click <strong>&quot;Generate token&quot;</strong> and copy it immediately (you won&apos;t see it again!)",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>What is GitHub?</strong> GitHub is where your website&apos;s code will live. Think of it as a safe vault for your site — every change is tracked and can be undone.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="GitHub Personal Access Token"
          value={state.github_token || ""}
          onChange={(v) => onUpdate({ github_token: v })}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/5?level=${level}`}
        />
      </div>
    </div>
  );
}
