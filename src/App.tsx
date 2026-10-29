import { useEffect, useState } from "react";
import type { ExerciseSpec } from "@/types";
import { useInitInput } from "@/hooks/useInput";
import { useProgress, type ReadingKind } from "@/store/progress";
import { inputBus } from "@/practice/inputBus";
import { AidControl, MidiStatus } from "@/components/TopControls";
import { PracticeSession } from "@/components/PracticeSession";
import { ReadingDrill } from "@/components/ReadingDrill";
import { CurriculumPage } from "@/pages/CurriculumPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { TeachersPage } from "@/pages/TeachersPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { cn } from "@/lib/cn";

type Tab = "curriculum" | "library" | "teachers" | "dashboard" | "settings";

type Session =
  | { type: "practice"; queue: ExerciseSpec[] }
  | { type: "reading"; kind: ReadingKind }
  | null;

const TABS: { id: Tab; label: string }[] = [
  { id: "curriculum", label: "Curriculum" },
  { id: "library", label: "Library" },
  { id: "teachers", label: "Teachers" },
  { id: "dashboard", label: "Progress" },
  { id: "settings", label: "Settings" },
];

const TAB_IDS = TABS.map((t) => t.id);

function initialTab(): Tab {
  const hash = typeof location !== "undefined" ? location.hash.replace("#", "") : "";
  return (TAB_IDS as string[]).includes(hash) ? (hash as Tab) : "curriculum";
}

export default function App() {
  useInitInput();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [session, setSession] = useState<Session>(null);
  const inputSource = useProgress((s) => s.settings.inputSource);

  // Keep QWERTY listener in sync with the chosen input source.
  useEffect(() => {
    if (inputSource === "qwerty") inputBus.startQwerty();
    else inputBus.stopQwerty();
    return () => inputBus.stopQwerty();
  }, [inputSource]);

  const startPractice = (queue: ExerciseSpec[]) => {
    if (queue.length) setSession({ type: "practice", queue });
  };
  const startReading = (kind: ReadingKind) => setSession({ type: "reading", kind });
  const exitSession = () => setSession(null);

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎹</span>
            <span className="text-lg font-bold">Jazz Scale Trainer</span>
          </div>
          <nav className="order-3 flex w-full gap-1 sm:order-2 sm:w-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setSession(null);
                  if (typeof location !== "undefined") location.hash = t.id;
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.id && !session
                    ? "bg-sky-500 text-white"
                    : "text-slate-300 hover:bg-white/10"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
            <AidControl />
            <MidiStatus />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {session?.type === "practice" ? (
          <PracticeSession queue={session.queue} onExit={exitSession} />
        ) : session?.type === "reading" ? (
          <ReadingDrill kind={session.kind} onExit={exitSession} />
        ) : tab === "curriculum" ? (
          <CurriculumPage onPractice={startPractice} onReading={startReading} />
        ) : tab === "library" ? (
          <LibraryPage onPractice={startPractice} />
        ) : tab === "teachers" ? (
          <TeachersPage onPractice={startPractice} />
        ) : tab === "dashboard" ? (
          <DashboardPage onPractice={startPractice} />
        ) : (
          <SettingsPage />
        )}
      </main>
    </div>
  );
}
