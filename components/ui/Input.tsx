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
          <label className="mb-1.5 block text-sm font-bold text-[var(--muted-strong)]">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex min-h-[48px] w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-base text-[var(--foreground)]",
            "placeholder:text-[var(--muted)]",
            "focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/15",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm font-medium text-[var(--danger)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[var(--muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
