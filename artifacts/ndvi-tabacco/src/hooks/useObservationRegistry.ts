import { useCallback, useEffect, useRef, useState } from "react";
import type { Observation } from "../App";

/** Same authenticated API on every device. Never reads another environment. */
export function useObservationRegistry(scope: string) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const active = useRef(true);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const mutations = useRef(0);
  const refreshRef = useRef<() => void>(() => {});

  const refresh = useCallback(async () => {
    if (!active.current || currentScope.current !== scope || mutations.current) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const id = ++requestId.current;
    try {
      const response = await fetch("/api/osservazioni", { signal: abort.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Registry read failed");
      const rows: unknown = await response.json();
      if (!Array.isArray(rows)) throw new Error("Invalid registry response");
      if (active.current && !abort.signal.aborted && id === requestId.current && currentScope.current === scope) {
        // Preserve derived maps and open views when the server data is unchanged.
        setObservations(previous => JSON.stringify(previous) === JSON.stringify(rows) ? previous : rows);
        setError(false);
      }
    } catch {
      if (active.current && !abort.signal.aborted && id === requestId.current && currentScope.current === scope) {
        // Never turn a failed refresh into an empty history.
        setError(true);
      }
    } finally {
      if (active.current && id === requestId.current && currentScope.current === scope) setLoading(false);
    }
  }, [scope]);
  refreshRef.current = () => { void refresh(); };

  useEffect(() => {
    active.current = true;
    mutations.current = 0;
    setObservations([]);
    setLoading(true);
    setError(false);
    void refresh();
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(visibleRefresh, 30_000);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      active.current = false;
      requestId.current++;
      controller.current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [scope, refresh]);

  const beginMutation = useCallback(() => {
    mutations.current++;
    requestId.current++;
    controller.current?.abort();
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      if (!active.current || currentScope.current !== scope) return;
      mutations.current = Math.max(0, mutations.current - 1);
      if (!mutations.current) refreshRef.current();
    };
  }, [scope]);

  return { observations, setObservations, loading, error, beginMutation, refresh };
}
