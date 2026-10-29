import { useEffect, useState } from "react";
import { ChartLine, Drum, GraduationCap, LibraryBig, PanelLeftClose, PanelLeftOpen, Search, Settings, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { navigate } from "@/lib/router";
import { daysThisMonth, useProgress } from "@/store/progress";
import { useInputStatus } from "@/hooks/useInput";
import { sound } from "@/audio/sound";
import { Kbd, Tip } from "@/components/ui";

const NAV = [
  { id: "today", label: "Today", icon: Sun },
  { id: "courses", label: "Courses", icon: GraduationCap },
  { id: "library", label: "Library", icon: LibraryBig },
  { id: "rhythm", label: "Rhythm", icon: Drum },
  { id: "progress", label: "Progress", icon: ChartLine },
];

export function Sidebar({ active }: { active: string }) {
  const collapsed = useProgress((s) => s.settings.sidebarCollapsed);
  const set = useProgress((s) => s.setSettings);
  const days = useProgress((s) => daysThisMonth(s));
  const unlockAll = useProgress((s) => s.settings.unlockAll);
  const status = useInputStatus();
  const [soundLabel, setSoundLabel] = useState(sound.label());
  useEffect(() => sound.onStatus(() => setSoundLabel(sound.label())), []);
  useEffect(() => setSoundLabel(sound.label()), [status]);

  const midiName = status.inPortName;
  const item = (id: string, label: string, Icon: typeof Sun) => {
    const on = active === id;
    const btn = (
      <button
        key={id}
        onClick={() => navigate(`/${id}`)}
        className={cn(
          "group flex h-9 w-full items-center gap-3 rounded-ctrl px-2.5 text-sm transition-colors duration-120",
          on ? "bg-line/[0.06] text-fg-1" : "text-fg-2 hover:bg-line/[0.04] hover:text-fg-1",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", on ? "text-accent" : "text-fg-3 group-hover:text-fg-2")} strokeWidth={1.75} />
        {!collapsed && <span>{label}</span>}
      </button>
    );
    return collapsed ? (
      <Tip key={id} content={label}>
        {btn}
      </Tip>
    ) : (
      btn
    );
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-line/[0.06] bg-bg-1 transition-[width] duration-280 ease-out",
        collapsed ? "w-16" : "w-[232px]"
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        {!collapsed && (
          <button onClick={() => navigate("/today")} className="flex items-baseline gap-2">
            <span className="font-serif text-[22px] leading-none text-fg-1">Étude</span>
            <span className="text-2xs uppercase tracking-[0.12em] text-fg-3">piano</span>
          </button>
        )}
        <button
          onClick={() => set({ sidebarCollapsed: !collapsed })}
          className={cn("rounded-ctrl p-1.5 text-fg-3 hover:bg-line/[0.05] hover:text-fg-1", !collapsed && "ml-auto")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-3">
        <button
          onClick={() => window.dispatchEvent(new Event("open-palette"))}
          className={cn(
            "mb-3 flex h-9 w-full items-center gap-2 rounded-ctrl border border-line/[0.06] bg-surface-1 px-2.5 text-sm text-fg-3 transition-colors hover:border-line/[0.1] hover:text-fg-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Search className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Jump to…</span>
              <Kbd>⌘K</Kbd>
            </>
          )}
        </button>
        <nav className="space-y-0.5">{NAV.map((n) => item(n.id, n.label, n.icon))}</nav>
      </div>

      <div className="flex-1" />

      <div className="space-y-0.5 px-3 pb-2">{item("settings", "Settings", Settings)}</div>

      <div className={cn("border-t border-line/[0.06] px-4 py-3 text-xs", collapsed && "px-0 text-center")}>
        <Tip content={midiName ? `MIDI in: ${midiName}` : status.midiSupported ? "No MIDI device. Plug in your Nord or use the computer keyboard." : "This browser has no Web MIDI. Use Chrome or Edge."}>
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", midiName ? "bg-success" : "bg-fg-4")} />
            {!collapsed && <span className="truncate text-fg-2">{midiName ?? (status.qwerty ? "Computer keyboard" : "No MIDI device")}</span>}
          </div>
        </Tip>
        {!collapsed && (
          <>
            <div className="mt-1 truncate pl-3.5 text-fg-3">Sound: {soundLabel}</div>
            <div className="mt-2 flex items-center justify-between pl-3.5 text-fg-3">
              <span>
                <span className="tabular text-fg-2">{days}</span> {days === 1 ? "day" : "days"} this month
              </span>
              {unlockAll && <span className="rounded-full bg-accent/[0.12] px-1.5 py-0.5 text-[10px] font-medium text-accent">All open</span>}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
