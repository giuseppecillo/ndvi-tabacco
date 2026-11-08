import { useMemo } from "react";
import { Info, Sprout } from "lucide-react";
import { CROP_PROFILES, getCropReference, type CatalogueCrop, type calculateCrop } from "@workspace/crop-calculations";
import { getLocale, t, useLanguage } from "../i18n/runtime";

type Piano = ReturnType<typeof calculateCrop>;
type Props = {
  crop: CatalogueCrop;
  varieta: string; onVarieta: (value: string) => void;
  resa: number; onResa: (value: number) => void;
  densita: number; onDensita: (value: number) => void;
  fase: string; onFase: (value: string) => void;
  confermata: boolean; onConferma: (value: boolean) => void;
  distribuito: number; onDistribuito: (value: number) => void;
  piano: Piano;
  errore?: string;
};

const inputClass = "w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-green-700";
const num = (v: number, digits = 2) => Number.isFinite(v) ? v.toLocaleString(getLocale(), { maximumFractionDigits: digits }) : "—";

export function CatalogueCropParameters(p: Props) {
  useLanguage();
  const varieties = useMemo(() => CROP_PROFILES.filter(x => x.crop === p.crop), [p.crop]);
  const resolved = useMemo(() => getCropReference(p.crop, p.varieta), [p.crop, p.varieta]);
  const sel = resolved?.selected;
  const ref = resolved?.reference;

  const numeric = (label: string, testId: string, value: number, onChange: (v: number) => void, step: string) =>
    <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-stone-700">
      {t(label)}
      <input aria-label={t(label)} data-testid={testId} type="number" min={0} step={step} inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        onChange={e => onChange(e.target.value === "" ? NaN : Number(e.target.value))} className={inputClass} />
    </label>;

  return (
    <div className="col-span-2 min-w-0 space-y-4" data-testid="catalogue-crop-parameters">
      <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-stone-700">
        {t("Varietà del catalogo")}
        <select data-testid="select-catalogue-variety" aria-label={t("Varietà del catalogo")} value={p.varieta}
          disabled={varieties.length === 0}
          onChange={e => { p.onVarieta(e.target.value); p.onConferma(false); }} className={inputClass}>
          {!sel && <option value="">{t("Seleziona la varietà")}</option>}
          {varieties.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
        </select>
      </label>
      <p className="nc-mono text-xs text-stone-500" data-testid="text-catalogue-variety-count">{t("Varietà disponibili")}: {varieties.length}</p>

      {varieties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white/70 px-4 py-6 text-center text-sm text-stone-500">{t("Nessuna varietà corrisponde ai filtri.")}</div>
      ) : !resolved || !sel || !ref ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" data-testid="text-catalogue-profile-error">
          {t("Profilo della varietà non valido o non presente nel catalogo: il calcolo non è disponibile.")}
        </p>
      ) : (
        <section key={sel.name} className="min-w-0 animate-in fade-in duration-300 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm" aria-label={t("Dettagli della varietà")}>
          <div className="flex items-start gap-2">
            <Sprout aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-green-800" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("Dettagli della varietà")}</p>
              <h3 className="break-words text-base font-semibold text-green-900" data-testid="text-catalogue-variety">{sel.name}</h3>
              <p className="break-words text-xs text-stone-600">{t(sel.destination)} · {t(sel.use)} · {t(sel.earliness)}</p>
            </div>
          </div>
          {resolved.kind === "affine" && (
            <p className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900" data-testid="text-catalogue-affine">
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("Profilo incompleto: si usa come riferimento la varietà affine della stessa coltura")} <strong>{ref.name}</strong>. {t("Non è una curva sperimentale validata per questa varietà.")}</span>
            </p>
          )}
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            {([["Piante/ha", ref.plants], ["Resa media (t/ha)", ref.yield], ["Azoto Totale (kg/ha)", ref.nitrogen]] as const).map(([label, v]) => (
              <div key={label} className="min-w-0 rounded-lg bg-[#f3efe4] px-1.5 py-2">
                <dt className="break-words text-[11px] leading-tight text-stone-600">{t(label)}</dt>
                <dd className="nc-mono mt-1 break-all text-sm font-semibold tabular-nums text-green-950">{num(v)}</dd>
              </div>
            ))}
          </dl>
          <ol className="mt-3 divide-y divide-stone-100 rounded-lg border border-stone-200" aria-label={t("Fasi di riferimento del catalogo")}>
            {ref.phases.map(ph => (
              <li key={ph.id} className={`grid min-w-0 grid-cols-[2rem_1fr] gap-x-2 px-3 py-2 text-sm transition-colors ${p.fase === ph.id ? "bg-green-50" : ""}`} data-testid={`row-catalogue-stage-${ph.id}`}>
                <span className="nc-mono row-span-2 text-xs font-semibold text-amber-700">{ph.id}</span>
                <span className="min-w-0 break-words font-medium text-stone-800">{t(ph.label)}</span>
                <span className="nc-mono flex flex-wrap gap-x-3 text-xs tabular-nums text-stone-600">
                  <span>N {num(ph.azoto)} kg/ha</span><span>BBCH {ph.bbch}</span><span>NDVI {num(ph.riferimento, 3)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {numeric("Resa Desiderata (t/ha)", "input-catalogue-yield", p.resa, p.onResa, "0.1")}
        {numeric("Densità (piante/ha)", "input-catalogue-density", p.densita, p.onDensita, "1")}
        {numeric("Azoto già distribuito (kg N/ha)", "input-catalogue-applied", p.distribuito, p.onDistribuito, "any")}
        <div className="min-w-0 rounded-lg bg-stone-50 p-3 text-sm">
          <p>{t("Fabbisogno azoto totale calcolato")}</p>
          <strong className="nc-mono" data-testid="text-catalogue-total">{p.piano.valida ? `${num(p.piano.azotoTotale)} kg N/ha` : "—"}</strong>
          <p className="mt-1 text-xs text-stone-600">{t("Il totale e le quote sono proporzionati alla resa; la densità è registrata senza correttivi azotati.")}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-green-950">
          {t("Fase della coltura rilevata in campo")}
          <select data-testid="select-catalogue-phase" aria-label={t("Fase della coltura rilevata in campo")} value={p.fase}
            disabled={!ref} onChange={e => { p.onFase(e.target.value); p.onConferma(false); }} className={inputClass}>
            <option value="">{t("Seleziona la fase")}</option>
            {ref?.phases.map(ph => <option key={ph.id} value={ph.id}>{ph.id} · {t(ph.label)} · BBCH {ph.bbch}</option>)}
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm text-green-950">
          <input type="checkbox" data-testid="confirm-catalogue-phase" checked={p.confermata} disabled={!p.fase}
            onChange={e => p.onConferma(e.target.checked)} className="mt-1" />
          {t("Confermo la fase osservata in campo")}
        </label>
        <p className="text-xs text-green-900">{t("La fase non viene dedotta automaticamente: va osservata e confermata in campo.")}</p>
        {p.errore && <p role="alert" className="text-sm font-semibold text-red-700">{t(p.errore)}</p>}
      </div>
    </div>
  );
}

export function CatalogueCropResults({ piano }: { piano: Piano }) {
  useLanguage();
  const pct = (v: number) => `${(v * 100).toLocaleString(getLocale(), { maximumFractionDigits: 1 })}%`;
  const items: [string, string, string?][] = [
    ["NDVI medio", num(piano.media, 3)],
    ["Varianza NDVI", num(piano.varianza, 5)],
    ["Deviazione standard", num(piano.deviazioneStandard, 4)],
    ["Coefficiente di variazione", `${num(piano.coefficienteVariazione, 1)}%`],
    ["NDVI riferimento", piano.attiva ? num(piano.ottimale, 3) : "—"],
    ["Deficit NDVI relativo", piano.attiva ? pct(piano.deficitRelativo) : "—"],
    ["Fabbisogno azoto totale calcolato", piano.valida ? `${num(piano.azotoTotale)} kg N/ha` : "—"],
    ["Azoto residuo del piano", piano.valida ? `${num(piano.residuo)} kg N/ha` : "—"],
    ["Quota della fase", piano.attiva && piano.valida ? `${num(piano.quota)} kg N/ha` : "—"],
  ];
  return (
    <section className="space-y-3 rounded-xl border-l-4 border-green-700 bg-green-50 p-5" data-testid="catalogue-crop-results">
      <h2 className="font-bold text-green-950">{t("Risultati coltura del catalogo")}</h2>
      {piano.resolved?.kind === "affine" && (
        <p className="text-xs text-amber-900">{t("Riferimento affine della stessa coltura")}: <strong>{piano.resolved.reference.name}</strong></p>
      )}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0"><dt className="text-stone-700">{t(label)}</dt><dd className="nc-mono break-words font-semibold">{value}</dd></div>
        ))}
      </dl>
      <div className="rounded-lg bg-white/80 p-3">
        <p className="text-sm text-stone-700">{t("Dose indicata nel punto")}</p>
        <strong className="nc-mono text-xl text-green-900" data-testid="text-catalogue-dose">{piano.pronta ? `${num(piano.dose, 1)} kg N/ha` : "—"}</strong>
      </div>
      {piano.pronta ? (
        <p className="text-xs text-green-900">
          {t("Dose = quota della fase × deficit NDVI relativo, limitata al residuo del piano.")}{" "}
          {num(piano.quota)} kg N/ha × {pct(piano.deficitRelativo)}; {t("Limite del residuo")}: {num(piano.residuo)} kg N/ha.{" "}
          {t("Con NDVI uguale o superiore al riferimento la dose è zero.")}
        </p>
      ) : (
        <p className="text-sm font-semibold text-amber-800">{t("Conferma la fase e verifica tutti i parametri prima di calcolare la dose.")}</p>
      )}
      {!piano.valida && <p className="text-sm text-red-700">{t("Parametri della coltura incompleti o non validi.")}</p>}
      {piano.valida && piano.coefficienteVariazione > 15 && (
        <p className="text-sm font-semibold text-amber-800">{t("Variabilità NDVI elevata: verificare le zone disomogenee prima di distribuire una dose uniforme.")}</p>
      )}
      <p className="text-xs text-stone-600">{t("Indicazione di supporto: la decisione finale spetta all’agronomo. Un NDVI basso non dimostra da solo una carenza di azoto: verificare anche acqua, suolo e stato sanitario.")}</p>
    </section>
  );
}
