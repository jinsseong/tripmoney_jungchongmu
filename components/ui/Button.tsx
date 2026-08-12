import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-semibold leading-tight transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985]";
    
    const variants = {
      primary:
        "bg-[var(--primary)] text-white shadow-[0_8px_18px_rgb(var(--color-primary)/22%)] hover:bg-[var(--primary-pressed)] focus:ring-[var(--primary)]",
      secondary:
        "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--line)] focus:ring-[var(--muted)]",
      outline:
        "border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--muted-strong)] hover:bg-[var(--surface-soft)] focus:ring-[var(--muted)]",
      ghost: "text-[var(--muted-strong)] hover:bg-[var(--surface-soft)] focus:ring-[var(--muted)]",
      danger:
        "bg-[var(--danger)] text-white shadow-[0_8px_18px_rgb(var(--color-danger)/18%)] hover:bg-[var(--danger-pressed)] focus:ring-[var(--danger)]",
      accent:
        "bg-[var(--accent)] text-white shadow-[0_8px_18px_rgb(var(--color-accent)/22%)] hover:bg-[var(--accent-pressed)] focus:ring-[var(--accent)]",
    };

    const sizes = {
      sm: "min-h-[44px] px-3 py-2 text-sm",
      md: "min-h-[48px] px-4 py-2.5 text-base",
      lg: "min-h-[56px] px-6 py-3 text-base sm:text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            처리 중...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
