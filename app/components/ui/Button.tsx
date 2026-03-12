import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const variantStyles = {
  primary:
    "bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus:ring-accent-500",
  ghost:
    "bg-transparent text-zinc-700 hover:bg-zinc-100 focus:ring-accent-500",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
} as const;

const sizeStyles = {
  sm: "px-2.5 py-1 text-xs rounded",
  md: "px-3.5 py-1.5 text-sm rounded-md",
  lg: "px-5 py-2.5 text-base rounded-lg",
} as const;

export type ButtonProps = {
  variant?: keyof typeof variantStyles;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
