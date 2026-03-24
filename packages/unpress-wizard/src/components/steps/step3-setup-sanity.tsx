"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step3Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step3SetupSanity({ level, state, onUpdate, onComplete }: Step3Props) {
  const handleVerify = async () => {
    if (!state.sanity_project_id || !state.sanity_token) {
      return { ok: false, message: "Please fill in Project ID and API Token." };
    }

    try {
      const res = await fetch("/api/verify/sanity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: state.sanity_project_id,
          dataset: state.sanity_dataset || "production",
          token: state.sanity_token,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ sanity_verified: true });
        onComplete();
        return { ok: true, message: `Connected to Sanity project!` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Could not connect to Sanity." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to <a href='https://www.sanity.io/manage' target='_blank' rel='noopener' class='text-[#D4603A] underline'>sanity.io/manage</a> and sign in (or create an account — <strong>signing in with GitHub is fastest</strong>)",
          "Click <strong>&quot;Create project&quot;</strong> and give it a name (e.g., &quot;My Website&quot;)",
          "Copy the <strong>Project ID</strong> from the project dashboard",
          "Go to <strong>API → Tokens → Add API Token</strong>, name it &quot;Unpress&quot;, set permissions to <strong>Editor</strong>",
          "Copy the token and paste it below",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>What is Sanity?</strong> Sanity is your new content editor — like WordPress admin but faster and AI-ready. Your posts, pages, and media will live here after migration.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="Sanity Project ID"
          value={state.sanity_project_id || ""}
          onChange={(v) => onUpdate({ sanity_project_id: v })}
          placeholder="e.g., abc123de"
          required
        />
        <InputField
          label="Dataset"
          value={state.sanity_dataset || "production"}
          onChange={(v) => onUpdate({ sanity_dataset: v })}
          placeholder="production"
          helper="Leave as 'production' unless you know what you're doing"
        />
        <InputField
          label="API Token"
          value={state.sanity_token || ""}
          onChange={(v) => onUpdate({ sanity_token: v })}
          placeholder="Paste your Sanity API token"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/4?level=${level}`}
        />
      </div>
    </div>
  );
}
