import type { SkillLevel } from "@/lib/wizard-types";

interface InstructionCardProps {
  level: SkillLevel;
  title: string;
  steps: string[];
  callout?: { icon: string; text: string };
  children?: React.ReactNode;
}

export function InstructionCard({ level, title, steps, callout, children }: InstructionCardProps) {
  if (level === "expert") return <>{children}</>;

  return (
    <div className="bg-white rounded-2xl border border-[#e8ddd3] overflow-hidden">
      <div className="px-6 py-4 bg-[#faf7f4] border-b border-[#e8ddd3] flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] font-medium">
          {level === "novice" ? "🌱 Detailed" : "⚡ Quick"}
        </span>
      </div>
      <div className="p-6">
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[#3d352e] leading-relaxed">
              <span className="w-7 h-7 bg-[#D4603A] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: step }} />
            </li>
          ))}
        </ol>

        {level === "novice" && callout && (
          <div className="flex items-start gap-3 bg-[#fef9f0] border border-[#f0dfc8] rounded-xl p-4 mt-4 text-sm text-[#6b6058] leading-relaxed">
            <span className="text-lg flex-shrink-0">{callout.icon}</span>
            <span dangerouslySetInnerHTML={{ __html: callout.text }} />
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
