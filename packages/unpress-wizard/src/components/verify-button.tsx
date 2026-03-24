"use client";

import { useState } from "react";
import Link from "next/link";

interface VerifyButtonProps {
  onVerify: () => Promise<{ ok: boolean; message: string }>;
  nextHref?: string;
  label?: string;
}

export function VerifyButton({ onVerify, nextHref, label = "Verify Connection" }: VerifyButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const result = await onVerify();
      setStatus(result.ok ? "success" : "error");
      setMessage(result.message);
    } catch {
      setStatus("error");
      setMessage("Connection failed. Please check your inputs and try again.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {status !== "success" && (
          <button
            onClick={handleClick}
            disabled={status === "loading"}
            className="px-6 py-3 bg-[#D4603A] text-white rounded-xl font-semibold text-sm hover:bg-[#b8502f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              <>{label} →</>
            )}
          </button>
        )}

        {status === "success" && nextHref && (
          <Link
            href={nextHref}
            className="px-6 py-3 bg-[#22c55e] text-white rounded-xl font-semibold text-sm hover:bg-[#16a34a] transition-colors"
          >
            Continue →
          </Link>
        )}
      </div>

      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${
          status === "success"
            ? "bg-[#f0fdf4] border border-[#22c55e] text-[#166534]"
            : "bg-[#fef2f2] border border-[#ef4444] text-[#991b1b]"
        }`}>
          <span>{status === "success" ? "✅" : "❌"}</span>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
