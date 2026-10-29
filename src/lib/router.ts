import { useEffect, useState } from "react";

/** Current hash path, e.g. "/practice/ex/dorian/D/thirds/2". */
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/today";
}

export function navigate(path: string) {
  if (currentPath() === path) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = path;
}

export function useRoute(): { path: string; parts: string[] } {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const on = () => setPath(currentPath());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return { path, parts: path.split("/").filter(Boolean).map(decodeURIComponent) };
}

export function exercisePath(spec: { scaleId: string; key: string; patternId: string; octaves: number; progressionId?: string }): string {
  if (spec.progressionId) return `/practice/prog/${spec.progressionId}/${encodeURIComponent(spec.key)}/${spec.patternId}`;
  return `/practice/ex/${spec.scaleId}/${encodeURIComponent(spec.key)}/${spec.patternId}/${spec.octaves}`;
}
