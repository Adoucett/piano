import { create } from "zustand";
import type { ExerciseSpec } from "@/types";
import type { ReadingDrillSpec } from "@/exercises/reading";

/** One step of a practice session: a scale/line, a reading sprint, or a rhythm drill. */
export type SessionItem =
  | { kind: "exercise"; spec: ExerciseSpec; label?: string }
  | { kind: "reading"; drill: ReadingDrillSpec; unitId: string; label?: string }
  | { kind: "rhythm"; drillId: string; label?: string };

interface SessionState {
  title: string;
  items: SessionItem[];
  index: number;
  returnTo: string;
  start: (title: string, items: SessionItem[], returnTo?: string) => void;
  next: () => boolean;
  prev: () => void;
  setIndex: (i: number) => void;
  clear: () => void;
}

export const useSession = create<SessionState>()((set, get) => ({
  title: "",
  items: [],
  index: 0,
  returnTo: "/today",
  start: (title, items, returnTo = "/today") => set({ title, items, index: 0, returnTo }),
  next: () => {
    const { index, items } = get();
    if (index + 1 >= items.length) return false;
    set({ index: index + 1 });
    return true;
  },
  prev: () => set((s) => ({ index: Math.max(0, s.index - 1) })),
  setIndex: (i) => set((s) => ({ index: Math.max(0, Math.min(s.items.length - 1, i)) })),
  clear: () => set({ items: [], index: 0, title: "" }),
}));
