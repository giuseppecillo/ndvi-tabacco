import { useMemo, useState } from "react";
import { FASI_POMODORO, POMODORO_DB, type calcolaPomodoro } from "@workspace/tomato-calculations";
import { getLocale, t } from "../i18n/runtime";

type Props = {
  varieta: string; onVarieta: (value: string) => void;
  resa: number; onResa: (value: number) => void;
  densita: number; onDensita: (value: number) => void;
  fase: string; onFase: (value: string) => void;
  confermata: boolean; onConferma: (value: boolean) => void;
  distribuito: number; onDistribuito: (value: number) => void;
  dataTrapianto: string; onDataTrapianto: (value: string) => void;
  giorni: number; giorniAutomatici: boolean; onGiorni: (value: number) => void;
  piano: ReturnType<typeof calcolaPomodoro>;
  errore?: string;
};
const inputClass = "w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm";
const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(getLocale(), { maximumFractionDigits: 2 }) : "—";

export function PomodoroParameters(p: Props) {
  const [destinazione, setDestinazione] = useState("");
  const opzioni = useMemo(() => Object.values(POMODORO_DB).filter((v) =>
    !destinazione || v.destinazione === destinazione),
  [destinazione]);
  const profilo = POMODORO_DB[p.varieta];
  const numeric = (label: string, value: number, onChange: (value: number) => void, min = 0) =>
    <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-stone-700">
      {t(label)}
      <input aria-label={t(label)} type="number" min={min} step="any" value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value))} className={inputClass} />
    </label>;
  return <div className="col-span-2 min-w-0 space-y-4" data-testid="pomodoro-parameters">
    <div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
        {t("Destinazione")}
        <select aria-label={t("Destinazione")} value={destinazione} onChange={(e) => setDestinazione(e.target.value)} className={inputClass}>
          <option value="">{t("Tutte le destinazioni")}</option>
          <option value="Industria">{t("Industria")}</option>
          <option value="Mensa">{t("Mensa")}</option>
        </select>
      </label>
    </div>
    <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-stone-700">
      {t("Varietà")}
      <select aria-label={t("Varietà pomodoro")} value={p.varieta} onChange={(e) => p.onVarieta(e.target.value)} className={inputClass}>
        {!opzioni.some((v) => v.id === p.varieta) && profilo && <option value={profilo.id}>{profilo.nome} — {t(profilo.destinazione)} · {t(profilo.impiego)}</option>}
        {opzioni.map((v) => <option value={v.id} key={v.id}>{v.nome} — {t(v.destinazione)} · {t(v.impiego)}</option>)}
      </select>
    </label>
    <p className="text-xs text-stone-600">{t("Profili trovati")}: {opzioni.length} / {Object.keys(POMODORO_DB).length}</p>
    {profilo && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-950">
      <strong>{profilo.nome}</strong> · {t(profilo.destinazione)} · {t(profilo.impiego)} · {t(profilo.precocita)}
      <p>{t("Riferimento del catalogo")}: {number(profilo.pianteHa)} {t("piante/ha")} · {number(profilo.resa)} t/ha · {number(profilo.azotoTotale)} kg N/ha.</p>
    </div>}
    <div className="grid gap-4 sm:grid-cols-2">
      {numeric("Resa Desiderata (t/ha)", p.resa, p.onResa, 0.1)}
      {numeric("Densità (piante/ha)", p.densita, p.onDensita, 1)}
      {numeric("Azoto già distribuito (kg N/ha)", p.distribuito, p.onDistribuito)}
      <div className="rounded-lg bg-stone-50 p-3 text-sm">
        <p>{t("Fabbisogno azoto totale calcolato")}</p>
        <strong data-testid="pomodoro-total">{number(p.piano.azotoTotale)} kg N/ha</strong>
        <p className="mt-1 text-xs">{t("Il totale e le quote sono proporzionati alla resa; la densità è registrata senza correttivi azotati non presenti nel file.")}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">{t("Data Trapianto")}
        <input aria-label={t("Data Trapianto")} type="date" value={p.dataTrapianto} onChange={(e) => p.onDataTrapianto(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">{t("Giorni dal Trapianto")}
        <input aria-label={t("Giorni dal Trapianto")} type="number" min="0" step="1" readOnly={p.giorniAutomatici} value={p.giorni}
          onChange={(e) => p.onGiorni(Number(e.target.value))} className={inputClass} />
      </label>
    </div>
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
      <label className="flex flex-col gap-1 text-sm font-semibold text-green-950">{t("Fase del pomodoro rilevata in campo")}
        <select aria-label={t("Fase del pomodoro")} value={p.fase} onChange={(e) => { p.onFase(e.target.value); p.onConferma(false); }} className={inputClass}>
          <option value="">{t("Seleziona la fase")}</option>
          {FASI_POMODORO.map((fase) => <option key={fase} value={fase}>{t(fase)}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm text-green-950">
        <input type="checkbox" checked={p.confermata} disabled={!p.fase} onChange={(e) => p.onConferma(e.target.checked)} className="mt-1" />
        {t("Confermo la fase osservata in campo")}
      </label>
      <p className="text-xs text-green-900">{t("Il riferimento NDVI è la media dei due estremi dell’intervallo del catalogo. La fase non viene dedotta automaticamente dai giorni.")}</p>
      {p.errore && <p role="alert" className="text-sm font-semibold text-red-700">{t(p.errore)}</p>}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[390px] text-left text-xs">
        <caption className="mb-2 text-left font-semibold">{t("Piano azoto pomodoro per fase")}</caption>
        <thead><tr><th>{t("Fase")}</th><th>kg N/ha</th><th>{t("Intervallo NDVI")}</th><th>{t("NDVI riferimento")}</th></tr></thead>
        <tbody>{p.piano.piano.map((fase, index) => <tr key={fase.fase} className={p.fase === fase.fase ? "bg-green-100" : ""}>
          <td className="py-2">{t(fase.fase)} · {[15, 30, 45, 10][index]}%</td><td>{number(fase.quota)}</td>
          <td>{fase.min.toFixed(2)}–{fase.max.toFixed(2)}</td><td>{fase.riferimento.toFixed(3)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="text-xs text-stone-500">{t("Le quote originali possono includere arrotondamenti. Un NDVI basso non dimostra da solo una carenza di azoto: verificare anche acqua, suolo e stato sanitario.")}</p>
  </div>;
}

export function PomodoroResults({ piano }: { piano: ReturnType<typeof calcolaPomodoro> }) {
  return <section className="rounded-xl border-l-4 border-green-700 bg-green-50 p-5 space-y-3" data-testid="pomodoro-results">
    <h2 className="font-bold text-green-950">{t("Risultati pomodoro")}</h2>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <p>{t("NDVI medio")}<br /><strong>{piano.media.toFixed(3)}</strong></p>
      <p>{t("NDVI riferimento")}<br /><strong>{piano.attiva ? piano.ottimale.toFixed(3) : "—"}</strong></p>
      <p>{t("Deficit NDVI relativo")}<br /><strong>{piano.attiva ? `${(piano.deficitRelativo * 100).toFixed(1)}%` : "—"}</strong></p>
      <p>{t("Dose indicata nel punto")}<br /><strong data-testid="pomodoro-dose">{piano.pronta ? `${number(piano.dose)} kg N/ha` : "—"}</strong></p>
      <p>{t("Varianza NDVI")}<br /><strong>{piano.varianza.toFixed(5)}</strong></p>
      <p>{t("Deviazione standard")}<br /><strong>{piano.deviazioneStandard.toFixed(4)}</strong></p>
      <p>{t("Coefficiente di variazione")}<br /><strong>{piano.coefficienteVariazione.toFixed(1)}%</strong></p>
      <p>{t("Scostamento NDVI")}<br /><strong>{piano.attiva ? piano.discostamento.toFixed(3) : "—"}</strong></p>
    </div>
    {piano.pronta ? <p className="text-xs text-green-900">
      {t("Quota della fase")} {number(piano.quota)} kg N/ha × {(piano.deficitRelativo * 100).toFixed(1)}%.
      {" "}{t("Limite del residuo")}: {number(piano.residuo)} kg N/ha.
      {" "}{t("Con NDVI uguale o superiore al riferimento la dose è zero.")}
    </p> : <p className="text-sm font-semibold text-amber-800">{t("Conferma la fase e verifica tutti i parametri prima di salvare il pomodoro.")}</p>}
    {!piano.valida && <p className="text-sm text-red-700">{t("Parametri pomodoro incompleti o non validi.")}</p>}
    {piano.valida && piano.coefficienteVariazione > 15 && <p className="text-sm font-semibold text-amber-800">
      {t("Variabilità NDVI elevata: verificare le zone disomogenee prima di distribuire una dose uniforme.")}
    </p>}
  </section>;
}
