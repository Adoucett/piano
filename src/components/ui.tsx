import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-slate-800/40 p-4 shadow-lg backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

type Variant = "primary" | "ghost" | "outline" | "subtle";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variants: Record<Variant, string> = {
    primary:
      "bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500",
    ghost: "bg-transparent text-slate-200 hover:bg-white/10",
    outline: "border border-white/15 bg-transparent text-slate-100 hover:bg-white/10",
    subtle: "bg-white/10 text-slate-100 hover:bg-white/20",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-xl border border-white/15 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-xl bg-slate-800 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-sky-500 text-white"
              : "text-slate-300 hover:text-white"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-200",
        className
      )}
    >
      {children}
    </span>
  );
}
