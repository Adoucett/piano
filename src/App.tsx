import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { TooltipProvider } from "@/components/ui";
import { useRoute } from "@/lib/router";
import { useInitInput, useInputStatus } from "@/hooks/useInput";
import { useProgress } from "@/store/progress";
import { sound } from "@/audio/sound";
import { setBackingRouting } from "@/audio/backing";
import { inputBus } from "@/practice/inputBus";
import { unlockAudioOnGesture } from "@/audio/context";

const TodayPage = lazy(() => import("@/pages/TodayPage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const RhythmPage = lazy(() => import("@/pages/RhythmPage"));
const ProgressPage = lazy(() => import("@/pages/ProgressPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const PracticePage = lazy(() => import("@/pages/PracticePage"));

/** Keep engines (sound, backing, latency, theme, QWERTY input) in sync with settings. */
function useEngineSync() {
  const settings = useProgress((s) => s.settings);
  const status = useInputStatus();

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.theme === "light" ? "#F6F4EF" : "#0C0D0F");
  }, [settings.theme]);

  useEffect(() => {
    sound.setSource(settings.soundSource);
  }, [settings.soundSource, status.midiOutReady]);

  useEffect(() => {
    setBackingRouting({ toNord: settings.backingToNord });
  }, [settings.backingToNord]);

  useEffect(() => {
    inputBus.latencyMs = settings.latencyMs;
  }, [settings.latencyMs]);

  useEffect(() => {
    if (settings.inputSource === "qwerty") inputBus.startQwerty();
    else inputBus.stopQwerty();
  }, [settings.inputSource]);

  // Quiet device toasts.
  const prevIn = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevIn.current === undefined) {
      prevIn.current = status.inPortName;
      return;
    }
    if (status.inPortName && status.inPortName !== prevIn.current) toast(`${status.inPortName} connected`);
    else if (!status.inPortName && prevIn.current) toast(`${prevIn.current} disconnected`);
    prevIn.current = status.inPortName;
  }, [status.inPortName]);
}

export default function App() {
  useInitInput();
  useEngineSync();
  const { parts } = useRoute();
  const page = parts[0] ?? "today";

  useEffect(() => {
    unlockAudioOnGesture();
    const params = new URLSearchParams(window.location.search);
    if (params.get("unlock") === "1") useProgress.getState().setSettings({ unlockAll: true });
  }, []);

  const full = page === "practice";
  const screens: Record<string, React.ReactNode> = {
    today: <TodayPage />,
    courses: <CoursesPage />,
    library: <LibraryPage />,
    rhythm: <RhythmPage />,
    progress: <ProgressPage />,
    settings: <SettingsPage />,
    practice: <PracticePage />,
  };

  return (
    <TooltipProvider>
      <div className="flex h-full bg-bg-0 text-fg-1">
        {!full && <Sidebar active={page} />}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Suspense fallback={<div className="h-full" />}>{screens[page] ?? <TodayPage />}</Suspense>
        </main>
      </div>
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "!bg-surface-2 !border !border-line/[0.08] !text-fg-1 !rounded-card !shadow-e3 !font-sans",
            description: "!text-fg-3",
          },
        }}
      />
    </TooltipProvider>
  );
}
