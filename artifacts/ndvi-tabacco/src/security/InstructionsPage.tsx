import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "@workspace/api-client-react";
import { Btn, ErrorNote, Eyebrow, Skeleton, TopBar } from "./ui";
import { ModuleHeading } from "./ModuleHeading";
import { t, useLanguage } from "../i18n/runtime";

// Sibling artifact: use its registered preview path, not the web app's base.
const presentationPath = "/nitrocrop-ndvi-presentazione/";

export function InstructionsPage({ account }: { account: Account }) {
  const [index, setIndex] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [isFull, setIsFull] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement === shell.current && !!shell.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const canFullscreen = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const toggleFullscreen = () => {
    setFullscreenError(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => setFullscreenError(true));
    else void shell.current?.requestFullscreen().catch(() => setFullscreenError(true));
  };
  const language = useLanguage();
  const slides = useQuery({
    queryKey: ["instructions-slides"],
    queryFn: async () => {
      const response = await fetch(`${presentationPath}instructions-slides.json`);
      if (!response.ok) throw new Error(t("Impossibile caricare la presentazione."));
      const positions: unknown = await response.json();
      if (!Array.isArray(positions) || !positions.length ||
          positions.some(position => !Number.isInteger(position) || position < 1)) {
        throw new Error(t("Impossibile caricare la presentazione."));
      }
      return positions as number[];
    },
  });
  const positions = slides.data;
  const current = Math.min(index, Math.max(0, (positions?.length ?? 1) - 1));

  useEffect(() => {
    const previous = document.title;
    document.title = `${t("Istruzioni")} — NitroCrop NDVI`;
    return () => { document.title = previous; };
  }, [language]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin ||
          event.source !== frame.current?.contentWindow || !positions) return;
      if (event.data?.type === "advanceSlide") {
        setIndex(i => Math.min(i + 1, positions.length - 1));
      } else if (event.data?.type === "retreatSlide") {
        setIndex(i => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [positions]);

  const slideUrl = `${presentationPath}slide${positions?.[current] ?? 1}?replitNav=parent&lang=${language}`;

  return (
    <div className="min-h-[100dvh]">
      <TopBar account={account} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <ModuleHeading title="NitroCrop NDVI"><Eyebrow>Istruzioni</Eyebrow></ModuleHeading>
        <p className="mt-3 text-sm text-[var(--nc-muted)]">La presentazione segue la lingua scelta nell’app, comprese le figure. Usa i pulsanti per scorrere le diapositive.</p>
        {slides.isPending && <div className="mt-6"><Skeleton rows={4} /></div>}
        {slides.isError && (
          <div className="mt-6 space-y-3">
            <ErrorNote error={new Error(t("Impossibile caricare la presentazione."))} />
            <Btn onClick={() => void slides.refetch()}>Riprova</Btn>
          </div>
        )}
        {fullscreenError && <p role="alert" className="mt-3 text-sm text-[var(--nc-danger)]">Schermo intero non disponibile. Apri la presentazione in una nuova scheda.</p>}
        {positions && (
          <>
            <div className="mt-6 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Btn variant="ghost" disabled={current === 0} onClick={() => setIndex(current - 1)} className="w-full sm:w-auto">Precedente</Btn>
              <Btn disabled={current === positions.length - 1} onClick={() => setIndex(current + 1)} className="w-full sm:order-3 sm:w-auto">Successiva</Btn>
              <label className="col-span-2 flex items-center gap-2 text-sm sm:order-2">
                <span>Diapositiva</span>
                <select
                  value={current}
                  onChange={event => setIndex(Number(event.target.value))}
                  className="min-h-[44px] flex-1 rounded-lg border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2 sm:flex-none"
                >
                  {positions.map((position, i) => <option key={position} value={i}>{i + 1} / {positions.length}</option>)}
                </select>
              </label>
              {canFullscreen && (
                <Btn variant="ghost" onClick={toggleFullscreen} className="col-span-2 w-full sm:order-4 sm:ml-auto sm:w-auto">
                  {isFull ? "Esci da schermo intero" : "Schermo intero"}
                </Btn>
              )}
            </div>
            <p className="nc-rotate-hint mt-3 items-center gap-2 rounded-lg border border-[var(--nc-line)] bg-[var(--nc-wheat-soft)] px-3 py-2 text-xs text-[var(--nc-ink)]">
              Ruota il dispositivo in orizzontale per leggere meglio le diapositive.
            </p>
            <div ref={shell} className="nc-slide-shell mt-4">
              <iframe
                ref={frame}
                src={slideUrl}
                title={`${t("Istruzioni")} — NitroCrop NDVI`}
                allowFullScreen
                className="aspect-video w-full rounded-xl border border-[var(--nc-line)] bg-white"
              />
            </div>
          </>
        )}
        <a
          href={`${presentationPath}?lang=${language}${positions ? `&startSlide=${positions[current]}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="nc-touch mt-4 inline-flex items-center text-sm font-semibold text-[var(--nc-leaf)] underline"
        >Apri la presentazione in una nuova scheda</a>
      </main>
    </div>
  );
}
