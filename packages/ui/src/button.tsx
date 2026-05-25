import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, icon, children, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-white text-ink-950 hover:bg-signal-cyan focus-visible:outline-signal-cyan",
        variant === "secondary" && "border border-white/15 bg-white/8 text-white hover:bg-white/14 focus-visible:outline-white/60",
        variant === "ghost" && "text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white/50",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
