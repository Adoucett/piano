import { cn } from "@/lib/cn";

export function PageShell({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-10 pb-16 pt-12 animate-fade-in", wide ? "max-w-[1320px]" : "max-w-[1120px]", className)}>{children}</div>;
}

export function PageTitle({ title, subtitle, right }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg-1">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-[640px] text-sm text-fg-3">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
