"use client";

import { useState } from "react";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "url";
  helper?: string;
  required?: boolean;
  readOnly?: boolean;
}

export function InputField({
  label, value, onChange, placeholder, type = "text", helper, required, readOnly,
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-[#3d352e]">
        {label}{required && <span className="text-[#D4603A]"> *</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword && !showPassword ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`w-full px-4 py-3 border-[1.5px] border-[#e8ddd3] rounded-xl text-sm font-[inherit] bg-white text-[#1a1a1a] outline-none transition-colors focus:border-[#D4603A] placeholder:text-[#bbb0a3] ${
            readOnly ? "bg-[#faf7f4] cursor-not-allowed" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8a7d72] hover:text-[#D4603A]"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {helper && <p className="text-xs text-[#8a7d72]">{helper}</p>}
    </div>
  );
}
