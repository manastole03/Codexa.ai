import type { ReactNode } from "react";
import { cn } from "./cn";

export function StatCard({
  label,
  value,
  icon,
  className
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/[0.04] p-4", className)}>
      <div className="flex items-center justify-between gap-3 text-white/55">
        <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
