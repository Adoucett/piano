import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/* ---------------- Surfaces ---------------- */

export function Card({
  className,
  children,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line/[0.06] bg-surface-1 shadow-e1",
        interactive &&
          "transition-colors duration-180 ease-out hover:border-line/[0.11] hover:bg-surface-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("text-2xs font-medium uppercase tracking-[0.08em] text-fg-3", className)}>
      {children}
    </div>
  );
}

/* ---------------- Buttons ---------------- */

type Variant = "primary" | "secondary" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg" | "icon";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = "secondary", size = "md", className, ...props }, ref) {
  const variants: Record<Variant, string> = {
    primary: "bg-accent text-accent-on hover:bg-accent-hover font-medium",
    secondary:
      "bg-surface-2 text-fg-1 border border-line/[0.08] hover:bg-surface-3 hover:border-line/[0.12]",
    ghost: "text-fg-2 hover:text-fg-1 hover:bg-line/[0.05]",
    quiet: "text-fg-3 hover:text-fg-1",
  };
  const sizes: Record<Size, string> = {
    sm: "h-7 px-2.5 text-xs gap-1.5",
    md: "h-9 px-3.5 text-sm gap-2",
    lg: "h-11 px-5 text-base gap-2",
    icon: "h-8 w-8 justify-center",
  };
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-ctrl transition-[background-color,border-color,color,transform] duration-120 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-line/[0.1] bg-surface-2 px-1 font-mono text-[10px] text-fg-3",
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function Pill({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "accent" | "success" | "error" | "info";
}) {
  const tones = {
    neutral: "bg-line/[0.06] text-fg-2",
    accent: "bg-accent/[0.14] text-accent",
    success: "bg-success/[0.14] text-success",
    error: "bg-error/[0.14] text-error",
    info: "bg-info/[0.14] text-info",
  };
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Segmented control ---------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex rounded-[8px] border border-line/[0.06] bg-bg-1 p-0.5",
        className
      )}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-ctrl font-medium transition-colors duration-120 ease-out",
              size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-3 text-sm",
              active
                ? "bg-surface-3 text-fg-1 shadow-e1"
                : "text-fg-3 hover:text-fg-1"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Select ---------------- */

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={(v) => onChange(v as T)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "inline-flex h-9 min-w-[140px] items-center justify-between gap-2 rounded-ctrl border border-line/[0.08] bg-surface-2 px-3 text-sm text-fg-1 outline-none transition-colors duration-120 hover:border-line/[0.14] disabled:opacity-40 data-[placeholder]:text-fg-3",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-3.5 w-3.5 text-fg-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-card border border-line/[0.08] bg-surface-2 shadow-e3 animate-fade-in"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="relative flex h-8 cursor-default select-none items-center rounded-ctrl pl-7 pr-3 text-sm text-fg-2 outline-none data-[highlighted]:bg-line/[0.06] data-[highlighted]:text-fg-1 data-[state=checked]:text-fg-1"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <Check className="h-3.5 w-3.5 text-accent" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ---------------- Slider / Switch ---------------- */

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      onValueChange={(v) => onChange(v[0])}
      min={min}
      max={max}
      step={step}
      className={cn("relative flex h-5 w-48 touch-none select-none items-center", className)}
    >
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-line/[0.1]">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-black/20 bg-fg-1 shadow-e2 outline-none transition-transform duration-120 hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent/60" />
    </SliderPrimitive.Root>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative h-5 w-9 shrink-0 rounded-full bg-line/[0.12] transition-colors duration-180 ease-out data-[state=checked]:bg-accent"
    >
      <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-fg-1 shadow-e2 transition-transform duration-180 ease-out data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-on" />
    </SwitchPrimitive.Root>
  );
}

/* ---------------- Tooltip / Popover / Dialog ---------------- */

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={350}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 rounded-ctrl border border-line/[0.08] bg-surface-3 px-2 py-1 text-xs text-fg-1 shadow-e3 animate-fade-in"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Popover({
  trigger,
  children,
  align = "end",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          className="z-50 w-72 rounded-panel border border-line/[0.08] bg-surface-2 p-4 shadow-e3 outline-none animate-fade-in"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[18%] z-50 w-[min(640px,92vw)] -translate-x-1/2 rounded-panel border border-line/[0.08] bg-surface-2 shadow-e3 outline-none animate-fade-in",
            className
          )}
        >
          <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Dialog</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ---------------- Progress ring / bar ---------------- */

export function Ring({
  value,
  size = 36,
  stroke = 3,
  className,
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line) / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - v)}
          style={{ transition: "stroke-dashoffset 420ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-line/[0.07]", className)}>
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-420 ease-out"
        style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}
      />
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-md font-semibold text-fg-1">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-fg-3">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
