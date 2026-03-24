"use client";

import { useState } from "react";
import type { SkillLevel, WizardState } from "@/lib/wizard-types";

interface Step7Props {
  level: SkillLevel;
  state: WizardState;
  onUpdate: (partial: Partial<WizardState>) => void;
  onComplete: () => void;
  onClearTokens: () => void;
}

export function Step7ReviewLaunch({ level, state, onComplete, onClearTokens }: Step7Props) {
  const [launched, setLaunched] = useState(false);
  const [copied, setCopied] = useState(false);

  const allVerified = state.wp_verified && state.sanity_verified && state.github_verified && state.vercel_verified && (state.inspiration_urls?.length ?? 0) >= 3;

  const configBlob = {
    tool: "unpress_start",
    params: {
      wp_url: state.wp_url,
      wp_auth_token: "••••••••",
      sanity_project_id: state.sanity_project_id,
      sanity_dataset: state.sanity_dataset || "production",
      sanity_token: "••••••••",
      github_token: "••••••••",
      vercel_token: "••••••••",
      inspiration_urls: state.inspiration_urls,
      skill_level: state.level,
    },
  };

  // Full config with real tokens (for copying)
  const fullConfig = JSON.stringify({
    tool: "unpress_start",
    params: {
      wp_url: state.wp_url,
      wp_auth_token: state.wp_auth_token,
      sanity_project_id: state.sanity_project_id,
      sanity_dataset: state.sanity_dataset || "production",
      sanity_token: state.sanity_token,
      github_token: state.github_token,
      vercel_token: state.vercel_token,
      inspiration_urls: state.inspiration_urls,
      skill_level: state.level,
    },
  }, null, 2);

  const handleLaunch = () => {
    setLaunched(true);
    onComplete();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullConfig);
    setCopied(true);
    onClearTokens(); // Security: clear tokens after copying
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3">
        <SummaryCard icon="🔌" label="WordPress" value={state.wp_url || "—"} verified={state.wp_verified} detail={state.wp_manifest_summary ? `${state.wp_manifest_summary.posts} posts, ${state.wp_manifest_summary.pages} pages, ${state.wp_manifest_summary.media} media` : undefined} />
        <SummaryCard icon="📦" label="Sanity CMS" value={state.sanity_project_id || "—"} verified={state.sanity_verified} detail={`Dataset: ${state.sanity_dataset || "production"}`} />
        <SummaryCard icon="🐙" label="GitHub" value={state.github_username ? `@${state.github_username}` : "—"} verified={state.github_verified} />
        <SummaryCard icon="▲" label="Vercel" value={state.vercel_username || "—"} verified={state.vercel_verified} />
        <SummaryCard icon="🎨" label="Design Inspiration" value={`${state.inspiration_urls?.length || 0} sites`} verified={(state.inspiration_urls?.length ?? 0) >= 3} />
      </div>

      {!launched ? (
        <div className="space-y-4">
          <div className="bg-[#fef9f0] border border-[#f0dfc8] rounded-xl p-4 text-sm text-[#6b6058] leading-relaxed">
            <strong className="text-[#1a1a1a]">What happens next:</strong> Unpress will scan your content, migrate it to Sanity, generate your new site based on your design preferences, and deploy it. You&apos;ll be able to preview everything before it goes live.
          </div>

          <button
            onClick={handleLaunch}
            disabled={!allVerified}
            className="w-full py-4 bg-[#D4603A] text-white rounded-2xl font-bold text-lg hover:bg-[#b8502f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Start Migration
          </button>

          {!allVerified && (
            <p className="text-sm text-[#991b1b] text-center">Complete all steps above before launching.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#f0fdf4] border-2 border-[#22c55e] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#166534] mb-2">✅ Configuration Ready!</h3>
            <p className="text-sm text-[#3d352e] mb-4">
              Copy the configuration below and paste it into your Claude conversation to start the migration.
            </p>
            <pre className="bg-[#1a1a1a] text-[#F5F0EB] p-4 rounded-xl text-xs overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(configBlob, null, 2)}
            </pre>
            <button
              onClick={handleCopy}
              className="mt-4 px-6 py-3 bg-[#D4603A] text-white rounded-xl font-semibold text-sm hover:bg-[#b8502f] transition-colors"
            >
              {copied ? "✅ Copied!" : "📋 Copy Full Config (with tokens)"}
            </button>
            <p className="text-xs text-[#8a7d72] mt-2">
              Tokens will be cleared from this browser after copying for security.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, verified, detail }: { icon: string; label: string; value: string; verified?: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#e8ddd3] rounded-xl p-4">
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#8a7d72] font-medium uppercase tracking-wider">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
        {detail && <div className="text-xs text-[#8a7d72]">{detail}</div>}
      </div>
      <span className="text-lg">{verified ? "✅" : "⏳"}</span>
    </div>
  );
}
