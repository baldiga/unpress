"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step5Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step5SetupVercel({ level, state, onUpdate, onComplete }: Step5Props) {
  const handleVerify = async () => {
    if (!state.vercel_token) return { ok: false, message: "Please enter your Vercel token." };

    try {
      const res = await fetch("/api/verify/vercel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.vercel_token }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ vercel_verified: true, vercel_username: data.data.username });
        onComplete();
        return { ok: true, message: `Connected to Vercel as ${data.data.username}!` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Could not connect to Vercel." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to <a href='https://vercel.com' target='_blank' rel='noopener' class='text-[#D4603A] underline'>vercel.com</a> and sign in (<strong>signing in with GitHub is fastest</strong>)",
          "Click your avatar → <strong>Settings</strong> → <strong>Tokens</strong>",
          "Click <strong>&quot;Create Token&quot;</strong>, name it <strong>&quot;Unpress&quot;</strong>",
          "Set scope to <strong>&quot;Full Account&quot;</strong>",
          "Copy the token and paste it below",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>What is Vercel?</strong> Vercel is where your website goes live — it&apos;s like your hosting but 10x faster. Your site will be available at yourproject.vercel.app within seconds of deployment.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="Vercel Access Token"
          value={state.vercel_token || ""}
          onChange={(v) => onUpdate({ vercel_token: v })}
          placeholder="Paste your Vercel token"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/6?level=${level}`}
        />
      </div>
    </div>
  );
}
