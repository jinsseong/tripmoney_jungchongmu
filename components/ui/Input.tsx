import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex min-h-[48px] w-full rounded-lg border border-[#d1d6db] bg-white px-3.5 py-2.5 text-base text-[#171719]",
            "placeholder:text-[#8b95a1]",
            "focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[#f04452] focus:border-[#f04452] focus:ring-[#f04452]/15",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm font-medium text-[#f04452]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[#6b7684]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
