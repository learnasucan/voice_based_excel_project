import { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning";

type Props = {
  children: ReactNode;
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700"
};

export const Badge = ({ children, variant = "default" }: Props) => (
  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${variants[variant]}`}>
    {children}
  </span>
);
