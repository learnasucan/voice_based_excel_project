import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const classesByVariant: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 disabled:cursor-not-allowed",
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
};

export const Button = ({
  variant = "primary",
  className,
  children,
  ...props
}: Props) => (
  <button
    className={`rounded-md px-3 py-2 text-sm font-medium transition ${classesByVariant[variant]} ${className ?? ""}`}
    {...props}
  >
    {children}
  </button>
);
