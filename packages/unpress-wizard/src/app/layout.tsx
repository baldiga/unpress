import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
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
        <NavBar />

        <main className="max-w-3xl mx-auto px-12 pb-8">
          {children}
        </main>

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
