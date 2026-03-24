import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="space-y-8 pt-8">
      {/* Safety Promise */}
      <div className="bg-[#f0fdf4] border-2 border-[#22c55e] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[#166534] mb-2">🔒 Your WordPress site stays untouched</h2>
        <p className="text-[#3d352e] text-sm leading-relaxed">
          Unpress reads and copies your content — it never modifies, deletes, or touches your live site.
          Think of it as taking a photo of your house before building a new one.
        </p>
      </div>

      {/* Hero */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#D4603A] font-semibold mb-3">Welcome to Unpress</p>
        <h1 className="text-4xl font-bold tracking-tight leading-tight mb-3">
          Move your WordPress site to the future.
        </h1>
        <p className="text-[#6b6058] text-base leading-relaxed">
          We&apos;ll migrate your content, design a beautiful new site based on styles you love,
          and deploy it — all with AI guiding every step. After migration, Claude stays as your
          site co-pilot: &quot;Change my header color&quot;, &quot;Add a testimonials section&quot; — and it just happens.
        </p>
      </div>

      {/* Why Unpress */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: "⚡", title: "Fast", desc: "Full migration in 15-45 minutes" },
          { icon: "💰", title: "Free tiers", desc: "Most sites cost $0/month to run" },
          { icon: "🔑", title: "You own it", desc: "Your code, your repo, your data" },
          { icon: "🤖", title: "AI co-pilot", desc: "Claude helps you after migration too" },
        ].map((item) => (
          <div key={item.title} className="bg-white border border-[#e8ddd3] rounded-xl p-4">
            <span className="text-2xl">{item.icon}</span>
            <h3 className="font-semibold mt-2">{item.title}</h3>
            <p className="text-sm text-[#6b6058] mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Skill Level Selection */}
      <div>
        <h2 className="text-lg font-bold mb-4">How experienced are you with dev tools?</h2>
        <div className="space-y-3">
          {[
            { level: "novice", icon: "🌱", title: "Novice", desc: "I'm new to this — guide me through everything with screenshots and explanations", color: "#22c55e" },
            { level: "medium", icon: "⚡", title: "Medium", desc: "I know my way around — just tell me the key steps", color: "#f59e0b" },
            { level: "expert", icon: "🚀", title: "Expert", desc: "Just give me the input fields — I know what to do", color: "#ef4444" },
          ].map((item) => (
            <Link
              key={item.level}
              href={`/step/1?level=${item.level}`}
              className="flex items-center gap-4 bg-white border-2 border-[#e8ddd3] rounded-xl p-4 hover:border-[#D4603A] transition-colors cursor-pointer"
            >
              <span className="text-3xl">{item.icon}</span>
              <div>
                <h3 className="font-semibold" style={{ color: item.color }}>{item.title}</h3>
                <p className="text-sm text-[#6b6058]">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
