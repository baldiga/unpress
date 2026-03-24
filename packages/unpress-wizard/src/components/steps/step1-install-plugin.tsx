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

  const downloadUrl = "https://github.com/baldiga/unpress/raw/master/plugins/unpress-wp.zip";

  return (
    <div className="space-y-6">
      {/* Download Button — always visible, all skill levels */}
      <div className="bg-white rounded-2xl border-2 border-[#D4603A] p-6 text-center">
        <p className="text-sm text-[#6b6058] mb-3">First, download the WordPress plugin:</p>
        <a
          href={downloadUrl}
          download="unpress-wp.zip"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#D4603A] text-white rounded-xl font-semibold text-base hover:bg-[#b8502f] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download unpress-wp.zip
        </a>
        <p className="text-xs text-[#8a7d72] mt-2">One file, ~7 KB — upload it to your WordPress site below</p>
      </div>

      <InstructionCard
        level={level}
        title="📋 Instructions"
        steps={[
          "<strong>Log in to your WordPress site</strong> — go to <strong>yourdomain.com/wp-admin</strong> and sign in with your admin account",
          "In the left sidebar, hover over <strong>&quot;Plugins&quot;</strong> and click <strong>&quot;Add New Plugin&quot;</strong>",
          "Click the <strong>&quot;Upload Plugin&quot;</strong> button at the top of the page",
          "Click <strong>&quot;Choose File&quot;</strong> and select the <strong>unpress-wp.zip</strong> file you just downloaded",
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
