"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step1Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step1InstallPlugin({ level, state, onUpdate, onComplete }: Step1Props) {
  const handleVerify = async () => {
    if (!state.wp_url) return { ok: false, message: "Please enter your WordPress site URL." };

    try {
      const res = await fetch("/api/verify/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.wp_url }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({ wp_verified: false }); // Partially verified (health only, no token yet)
        onComplete();
        return { ok: true, message: `Found WordPress ${data.data?.wp_version || ""} — plugin active!` };
      }
      return { ok: false, message: data.error || "Could not connect. Make sure the plugin is installed and activated." };
    } catch {
      return { ok: false, message: "Network error. Check the URL and try again." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "<strong>Log in to your WordPress site</strong> — go to <strong>yourdomain.com/wp-admin</strong> and sign in with your admin account",
          "In the left sidebar, hover over <strong>&quot;Plugins&quot;</strong> and click <strong>&quot;Add New Plugin&quot;</strong>",
          "Click the <strong>&quot;Upload Plugin&quot;</strong> button at the top of the page",
          "Click <strong>&quot;Choose File&quot;</strong> and select the <strong>unpress-wp.zip</strong> file — you can download it from the <a href='https://github.com/baldiga/unpress/tree/master/plugins/unpress-wp' target='_blank' rel='noopener' class='text-[#D4603A] underline'>GitHub repo</a>",
          "Click <strong>&quot;Install Now&quot;</strong> and wait for it to finish — then click <strong>&quot;Activate Plugin&quot;</strong>",
        ]}
        callout={{
          icon: "💡",
          text: "<strong>Don&apos;t worry</strong> — this plugin only reads your content. It doesn&apos;t change anything on your WordPress site. You can remove it after the migration is complete.",
        }}
      />

      <div className="space-y-4">
        <InputField
          label="Your WordPress Site URL"
          value={state.wp_url || ""}
          onChange={(v) => onUpdate({ wp_url: v })}
          placeholder="https://yourdomain.com"
          type="url"
          required
          helper="Enter the URL of your WordPress site (without /wp-admin)"
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/2?level=${level}`}
          label="Verify Connection"
        />
      </div>
    </div>
  );
}
