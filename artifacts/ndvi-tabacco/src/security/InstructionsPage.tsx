import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "@workspace/api-client-react";
import { Btn, ErrorNote, Eyebrow, Skeleton, TopBar } from "./ui";
import { t, useLanguage } from "../i18n/runtime";

// Sibling artifact: use its registered preview path, not the web app's base.
const presentationPath = "/nitrocrop-ndvi-presentazione/";

export function InstructionsPage({ account }: { account: Account }) {
  const [index, setIndex] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
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
    document.title = `${t("Istruzioni")} — Nitro Crop NDVI`;
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

  const slideUrl = `${presentationPath}slide${positions?.[current] ?? 1}?replitNav=parent`;

  return (
    <div className="min-h-[100dvh]">
      <TopBar account={account} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Eyebrow>Istruzioni</Eyebrow>
        <h1 className="nc-display mt-2 text-4xl font-semibold text-[var(--nc-leaf)]">Nitro Crop NDVI</h1>
        <p className="mt-3 text-sm text-[var(--nc-muted)]">Presentazione in italiano. Usa i pulsanti per scorrere le diapositive.</p>
        {slides.isPending && <div className="mt-6"><Skeleton rows={4} /></div>}
        {slides.isError && (
          <div className="mt-6 space-y-3">
            <ErrorNote error={new Error(t("Impossibile caricare la presentazione."))} />
            <Btn onClick={() => void slides.refetch()}>Riprova</Btn>
          </div>
        )}
        {positions && (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Btn variant="ghost" disabled={current === 0} onClick={() => setIndex(current - 1)}>Precedente</Btn>
              <label className="flex items-center gap-2 text-sm">
                <span>Diapositiva</span>
                <select
                  value={current}
                  onChange={event => setIndex(Number(event.target.value))}
                  className="rounded-lg border border-[var(--nc-line)] bg-[var(--nc-paper)] px-3 py-2"
                >
                  {positions.map((position, i) => <option key={position} value={i}>{i + 1} / {positions.length}</option>)}
                </select>
              </label>
              <Btn disabled={current === positions.length - 1} onClick={() => setIndex(current + 1)}>Successiva</Btn>
            </div>
            <iframe
              ref={frame}
              src={slideUrl}
              title="Nitro Crop NDVI"
              allowFullScreen
              className="mt-4 aspect-video w-full rounded-xl border border-[var(--nc-line)] bg-white"
            />
          </>
        )}
        <a
          href={positions ? `${presentationPath}slide${positions[current]}` : presentationPath}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-[var(--nc-leaf)] underline"
        >Apri la presentazione in una nuova scheda</a>
      </main>
    </div>
  );
}
