import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Unpress — AI Website Migration",
  description: "Migrate your WordPress site to a modern AI-powered stack",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F5F0EB] text-[#1a1a1a] min-h-screen`}>
        {/* Nav */}
        <nav className="flex items-center justify-between px-12 py-5 max-w-5xl mx-auto">
          <div className="text-2xl font-bold tracking-tight">
            <span className="text-[#D4603A]">Un</span>press
          </div>
          <div className="flex items-center gap-2" id="step-dots" />
          <div className="bg-white px-3.5 py-1.5 rounded-full text-xs font-medium text-[#D4603A] border border-[#e8ddd3]" id="skill-badge">
            🌱 Novice
          </div>
        </nav>

        {/* Main */}
        <main className="max-w-3xl mx-auto px-12 pb-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="max-w-3xl mx-auto px-12 py-6 border-t border-[#e0d6cb] text-center text-sm text-[#8a7d72]">
          Built by Amir Baldiga ·{" "}
          <a href="https://linkedin.com/in/amirbaldiag" target="_blank" rel="noopener" className="text-[#D4603A] font-medium hover:underline">
            Connect on LinkedIn
          </a>
        </footer>
      </body>
    </html>
  );
}
