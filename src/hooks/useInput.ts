import { useEffect, useState } from "react";
import { inputBus, type InputStatus, type NoteEvent } from "@/practice/inputBus";

let initPromise: Promise<void> | null = null;

/** Initialize the input bus once for the whole app. */
export function useInitInput() {
  useEffect(() => {
    if (!initPromise) initPromise = inputBus.init();
  }, []);
}

/** The set of MIDI notes currently held down (from any input source). */
export function useHeldNotes(): Set<number> {
  const [held, setHeld] = useState<Set<number>>(() => new Set(inputBus.held));
  useEffect(() => inputBus.onHeld(setHeld), []);
  return held;
}

/** Live MIDI device status. */
export function useInputStatus(): InputStatus {
  const [status, setStatus] = useState<InputStatus>(() => inputBus.getStatus());
  useEffect(() => {
    setStatus(inputBus.getStatus());
    return inputBus.onStatus(setStatus);
  }, []);
  return status;
}

/** Subscribe to note events. Handler is kept fresh without re-subscribing. */
export function useNoteEvents(handler: (e: NoteEvent) => void) {
  useEffect(() => {
    return inputBus.onNote(handler);
  }, [handler]);
}
