"use client";

import { InstructionCard } from "@/components/instruction-card";
import { InputField } from "@/components/input-field";
import { VerifyButton } from "@/components/verify-button";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step2Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
}

export function Step2ConnectWordPress({ level, state, onUpdate, onComplete }: Step2Props) {
  const handleVerify = async () => {
    if (!state.wp_auth_token) return { ok: false, message: "Please enter your auth token." };
    if (!state.wp_url) return { ok: false, message: "WordPress URL missing. Go back to Step 1." };

    try {
      const res = await fetch("/api/verify/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.wp_url, token: state.wp_auth_token }),
      });
      const data = await res.json();

      if (data.ok) {
        onUpdate({
          wp_verified: true,
          wp_manifest_summary: {
            posts: data.data.posts,
            pages: data.data.pages,
            media: data.data.media,
            plugins: data.data.plugins,
          },
        });
        onComplete();
        return { ok: true, message: `Connected! Found ${data.data.posts} posts, ${data.data.pages} pages, ${data.data.media} media files.` };
      }
      return { ok: false, message: data.error || "Verification failed." };
    } catch {
      return { ok: false, message: "Network error. Check your connection and try again." };
    }
  };

  return (
    <div className="space-y-6">
      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "Go to your <strong>WordPress admin panel</strong> (yourdomain.com/wp-admin)",
          "In the left sidebar, click <strong>&quot;Unpress&quot;</strong>",
          "Check the <strong>consent checkbox</strong> to confirm you want to migrate",
          "Copy the <strong>Migration Token</strong> shown on the page",
          "Paste it below and click Verify",
        ]}
        callout={{
          icon: "🔒",
          text: "<strong>This token is read-only</strong> — it lets Unpress read your content but cannot modify anything on your site. The token expires after 1 hour.",
        }}
      />

      <div className="space-y-4">
        {state.wp_url && (
          <InputField
            label="WordPress URL"
            value={state.wp_url}
            onChange={() => {}}
            readOnly
          />
        )}
        <InputField
          label="Migration Token"
          value={state.wp_auth_token || ""}
          onChange={(v) => onUpdate({ wp_auth_token: v })}
          placeholder="Paste your token here"
          type="password"
          required
        />
        <VerifyButton
          onVerify={handleVerify}
          nextHref={`/step/3?level=${level}`}
          label="Verify Token"
        />
      </div>
    </div>
  );
}
