import { useState, useCallback, useMemo, useEffect } from "react";
const taurusLogo = `${import.meta.env.BASE_URL}taurus-logo.png`;
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ElaborazioniMappe } from "./ElaborazioniMappe";
import { exportObservationsCsv } from "./utils/geoUtils";
import {
  calcola,
  calcolaDensita,
  calcolaDensitaGrano,
  calcolaFabbisognoNGrano,
  calcolaPianoNGrano,
  calcolaQuotaNGrano,
  ETA_GIORNI_EQUIVALENTI,
  FINESTRE_DAS_LOCALI_TEMPLATE,
  FASI_GRANO,
  faseGranoConfermataDaBbch,
  faseGranoDaBbch,
  GRANO_DURO_DB,
  NDVI_FASI,
  PROFILO_FENOLOGICO_GRANO,
  granoKgHaDaSemiMq,
  granoSemiMqDaKgHa,
  ndviOttimale,
  statisticheNdvi,
  stimaFaseGranoDaDas,
} from "./calculations";
import type {
  Coltura,
  DensitaUnita,
  EtaPiantina,
  FaseGrano,
  FinestraDasLocale,
  GranoVarietaDati,
  VarietaDati,
} from "./calculations";
export {
  calcola,
  calcolaDensita,
  calcolaDensitaGrano,
  calcolaFabbisognoNGrano,
  calcolaPianoNGrano,
  calcolaQuotaNGrano,
  faseGranoConfermataDaBbch,
  faseGranoDaBbch,
  faseGranoDaDas,
  granoKgHaDaSemiMq,
  granoSemiMqDaKgHa,
  ndviOttimale,
  statisticheNdvi,
  stimaFaseGranoDaDas,
} from "./calculations";
export type { Coltura, DensitaUnita, EtaPiantina, FaseGrano, FinestraDasLocale, GranoVarietaDati, VarietaDati } from "./calculations";

export const ETA_PIANTINA_LABELS: Record<EtaPiantina, { label: string; short: string; giorni: string }> = {
  standard: { label: "Standard",       short: "Std",  giorni: "25–35 gg vivaio" },
  avanzata: { label: "Avanzata",       short: "Av.",  giorni: "35–45 gg vivaio" },
  extra:    { label: "Extra-avanzata", short: "Ext.", giorni: "> 45 gg vivaio"  },
};

export { FASI_GRANO, GRANO_DURO_DB } from "./calculations";

export type ParametriAziendali = {
  densitaPianteHa: number;
  kgSemiHa: number;
};

export const VARIETA_DB: Record<string, VarietaDati> = {
  "Burley (Non Cimato)": {
    label: "Burley (Non Cimato)",
    categoria: "Light Air-Cured",
    resaDefault: 4.5, resaMin: 4.0, resaMax: 5.6,
    azotoDefault: 175, azotoMin: 150, azotoMax: 200,
    kgNPerTon: 36,   // 200 kg / 5.6 t ≈ 35.7 → arrotondato a 36
    densitaPianteDefault: 16000, kgSemiDefault: 0.0020,
  },
  "Burley (Cimato)": {
    label: "Burley (Cimato)",
    categoria: "Light Air-Cured",
    resaDefault: 3.0, resaMin: 2.5, resaMax: 4.0,
    azotoDefault: 115, azotoMin: 80, azotoMax: 150,
    kgNPerTon: 38,   // 150 kg / 4.0 t = 37.5 → arrotondato a 38
    densitaPianteDefault: 18000, kgSemiDefault: 0.0023,
  },
  "Virginia Bright": {
    label: "Virginia Bright",
    categoria: "Flue-Cured",
    resaDefault: 3.5, resaMin: 2.8, resaMax: 4.2,
    azotoDefault: 130, azotoMin: 100, azotoMax: 160,
    kgNPerTon: 38,   // 160 kg / 4.2 t ≈ 38.1
    densitaPianteDefault: 18000, kgSemiDefault: 0.0023,
  },
  "Kentucky": {
    label: "Kentucky",
    categoria: "Fire-Cured",
    resaDefault: 2.2, resaMin: 1.8, resaMax: 3.3,
    azotoDefault: 135, azotoMin: 100, azotoMax: 160,
    kgNPerTon: 48,   // 160 kg / 3.3 t ≈ 48.5 → arrotondato a 48
    densitaPianteDefault: 15000, kgSemiDefault: 0.0019,
  },
  "Dark Air-Cured (DAC)": {
    label: "Dark Air-Cured (DAC)",
    categoria: "Dark Air-Cured",
    resaDefault: 3.0, resaMin: 2.5, resaMax: 3.7,
    azotoDefault: 175, azotoMin: 150, azotoMax: 200,
    kgNPerTon: 54,   // 200 kg / 3.7 t ≈ 54.1
    densitaPianteDefault: 16000, kgSemiDefault: 0.0020,
  },
  "Nostrano del Brenta": {
    label: "Nostrano del Brenta",
    categoria: "Light Air-Cured",
    resaDefault: 2.4, resaMin: 2.0, resaMax: 2.8,
    azotoDefault: 110, azotoMin: 100, azotoMax: 120,
    kgNPerTon: 43,   // 120 kg / 2.8 t ≈ 42.9 → arrotondato a 43
    densitaPianteDefault: 20000, kgSemiDefault: 0.0025,
  },
  "Beneventano": {
    label: "Beneventano",
    categoria: "Dark Air-Cured",
    resaDefault: 1.5, resaMin: 1.0, resaMax: 2.0,
    azotoDefault: 90, azotoMin: 80, azotoMax: 100,
    kgNPerTon: 50,   // 100 kg / 2.0 t = 50
    densitaPianteDefault: 22000, kgSemiDefault: 0.0028,
  },
  "Orientali (Samsun/Xanti Yaka)": {
    label: "Orientali (Samsun/Xanti Yaka)",
    categoria: "Sun-Cured",
    resaDefault: 1.5, resaMin: 1.0, resaMax: 2.0,
    azotoDefault: 40, azotoMin: 0, azotoMax: 50,
    kgNPerTon: 55,   // esplicitamente 5.5 kg N/quintal dal documento Taurus
    densitaPianteDefault: 28000, kgSemiDefault: 0.0035,
  },
  "Tabacco Sigari (Wrapper)": {
    label: "Tabacco Sigari (Wrapper)",
    categoria: "Shade-Grown",
    resaDefault: 2.0, resaMin: 1.5, resaMax: 2.5,
    azotoDefault: 165, azotoMin: 140, azotoMax: 190,
    kgNPerTon: 76,   // 190 kg / 2.5 t = 76
    densitaPianteDefault: 12000, kgSemiDefault: 0.0015,
  },
};

// Riferimenti aziendali usati dalla conversione kg seme/ha → piante/ha.
// I valori sono modificabili nel pannello "Parametri aziendali" e vengono
// mantenuti sul dispositivo, così la conferma di ogni varietà non resta
// nascosta dentro la formula.
export const PARAMETRI_AZIENDALI_DEFAULT: Record<string, ParametriAziendali> =
  Object.fromEntries(
    Object.values(VARIETA_DB).map((varieta) => [
      varieta.label,
      {
        densitaPianteHa: varieta.densitaPianteDefault,
        kgSemiHa: varieta.kgSemiDefault,
      },
    ])
  );

export type Observation = {
  id: string;
  coltura: Coltura;
  data: string;
  dataTrapianto: string;
  dataSemina?: string;
  giorni: number;
  faseFenologica?: string;
  bbch?: string | null;
  faseFonte?: string | null;
  etaPiantina: EtaPiantina;
  cliente: string;
  appezzamento: string;
  resa: number;
  varieta: string;
  densitaValore?: number | null;
  densitaUnita?: DensitaUnita | null;
  pianteHaEquivalenti?: number | null;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  media: number;
  ottimale: number;
  discostamento: number;
  dose: number;
  azotoTotale?: number | null;
  azotoGiaDistribuito?: number | null;
  quotaAzoto?: number | null;
  lat: number | null;
  lng: number | null;
};

const PARAMETRI_AZIENDALI_STORAGE_KEY = "ndvi-tabacco-parametri-aziendali";
const FINESTRE_DAS_GRANO_STORAGE_KEY = "ndvi-tabacco-finestre-das-grano";

function caricaParametriAziendali(): Record<string, ParametriAziendali> {
  if (typeof window === "undefined") return PARAMETRI_AZIENDALI_DEFAULT;
  try {
    const salvati = JSON.parse(window.localStorage.getItem(PARAMETRI_AZIENDALI_STORAGE_KEY) ?? "null");
    if (!salvati || typeof salvati !== "object") return PARAMETRI_AZIENDALI_DEFAULT;
    return Object.fromEntries(
      Object.entries(PARAMETRI_AZIENDALI_DEFAULT).map(([label, defaults]) => {
        const valore = salvati[label] as Partial<ParametriAziendali> | undefined;
        const densitaPianteHa = Number(valore?.densitaPianteHa);
        const kgSemiHa = Number(valore?.kgSemiHa);
        return [
          label,
          {
            densitaPianteHa: Number.isFinite(densitaPianteHa) && densitaPianteHa > 0
              ? densitaPianteHa
              : defaults.densitaPianteHa,
            kgSemiHa: Number.isFinite(kgSemiHa) && kgSemiHa > 0
              ? kgSemiHa
              : defaults.kgSemiHa,
          },
        ];
      })
    );
  } catch {
    return PARAMETRI_AZIENDALI_DEFAULT;
  }
}

function caricaFinestreDasGrano(): FinestraDasLocale[] {
  if (typeof window === "undefined") return FINESTRE_DAS_LOCALI_TEMPLATE;
  try {
    const salvate = JSON.parse(window.localStorage.getItem(FINESTRE_DAS_GRANO_STORAGE_KEY) ?? "null");
    if (!Array.isArray(salvate) || salvate.length !== FINESTRE_DAS_LOCALI_TEMPLATE.length) {
      return FINESTRE_DAS_LOCALI_TEMPLATE;
    }
    return FINESTRE_DAS_LOCALI_TEMPLATE.map((template) => {
      const valore = salvate.find((item) => item?.fase === template.fase) as Partial<FinestraDasLocale> | undefined;
      const dasMin = Number(valore?.dasMin);
      const dasMax = valore?.dasMax === null ? null : Number(valore?.dasMax);
      return {
        fase: template.fase,
        dasMin: Number.isInteger(dasMin) && dasMin >= 0 ? dasMin : template.dasMin,
        dasMax: dasMax === null || (Number.isInteger(dasMax) && dasMax >= dasMin) ? dasMax : template.dasMax,
      };
    });
  } catch {
    return FINESTRE_DAS_LOCALI_TEMPLATE;
  }
}


function diffDays(from: string, to: string): number | null {
  if (!from || !to) return null;
  const parseDateOnly = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
  };
  const a = parseDateOnly(from);
  const b = parseDateOnly(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  const d = Math.round((b - a) / 86_400_000);
  return d >= 0 ? d : null;
}

const inputCls =
  "w-full px-3 py-2.5 border border-stone-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition bg-white";

const disabledCls =
  "w-full px-3 py-2.5 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 text-base cursor-not-allowed";

function TextInput({
  label, value, onChange, placeholder, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      <input type="text" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} ${error ? "border-red-400 focus:ring-red-400" : ""}`} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function DateInput({
  label, value, onChange, hint, warning,
}: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; warning?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} ${warning ? "border-amber-400 text-amber-700 focus:ring-amber-400" : ""}`} />
      {warning && <p className="text-xs text-amber-600 font-medium">⚠ {warning}</p>}
      {!warning && hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

function NumberInput({
  label, value, onChange, step = 1, min, max, hint, warning, readonly,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; hint?: string; warning?: string; readonly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      {readonly ? (
        <input type="number" aria-label={label} value={value} readOnly className={disabledCls} />
      ) : (
        <input type="number" aria-label={label} value={value} step={step} min={min} max={max}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`${inputCls} ${warning ? "border-amber-400 text-amber-700 focus:ring-amber-400" : ""}`} />
      )}
      {warning && <p className="text-xs text-amber-600 font-medium">⚠ {warning}</p>}
      {!warning && hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);

export default function App() {
  const [activeTab, setActiveTab]       = useState<"calcolatore" | "elaborazioni">("calcolatore");
  const [obsId, setObsId]               = useState("1");
  const [coltura, setColtura]           = useState<Coltura>("tabacco");
  const [data, setData]                 = useState(today);
  const [dataTrapianto, setDataTrapianto] = useState("");
  const [cliente, setCliente]           = useState("");
  const [appezzamento, setAppezzamento] = useState("");
  const [varieta, setVarieta]           = useState("Burley (Non Cimato)");
  const [resa, setResa]                 = useState(VARIETA_DB["Burley (Non Cimato)"].resaDefault);
  const [azotoTot, setAzotoTot]         = useState(VARIETA_DB["Burley (Non Cimato)"].azotoDefault);
  const [densitaUnita, setDensitaUnita] = useState<DensitaUnita>("piante/ha");
  const [densitaValore, setDensitaValore] = useState(VARIETA_DB["Burley (Non Cimato)"].densitaPianteDefault);
  const [giorniManuale, setGiorniManuale] = useState(31);
  const [bbchGrano, setBbchGrano] = useState("");
  const [bbchGranoConfermato, setBbchGranoConfermato] = useState(false);
  const [azotoGiaDistribuito, setAzotoGiaDistribuito] = useState(0);
  const [finestreDasGrano, setFinestreDasGrano] = useState<FinestraDasLocale[]>(caricaFinestreDasGrano);
  const [n1, setN1] = useState(0.42);
  const [n2, setN2] = useState(0.38);
  const [n3, setN3] = useState(0.41);
  const [n4, setN4] = useState(0.39);
  const [n5, setN5] = useState(0.4);
  const [etaPiantina, setEtaPiantina] = useState<EtaPiantina>("standard");
  const [osservazioni, setOsservazioni] = useState<Observation[]>([]);
  const [loadingOss, setLoadingOss] = useState(true);
  const [parametriAziendali, setParametriAziendali] = useState<Record<string, ParametriAziendali>>(
    caricaParametriAziendali
  );
  const isGranoDuro = coltura === "grano duro";
  const datiGrano = GRANO_DURO_DB[varieta] ?? GRANO_DURO_DB.Redidenari;
  const datiBaseVarieta = VARIETA_DB[varieta] ?? VARIETA_DB["Burley (Non Cimato)"];
  const riferimentoAziendale = parametriAziendali[varieta] ?? {
    densitaPianteHa: datiBaseVarieta.densitaPianteDefault,
    kgSemiHa: datiBaseVarieta.kgSemiDefault,
  };
  const datiVarieta: VarietaDati = {
    ...datiBaseVarieta,
    densitaPianteDefault: riferimentoAziendale.densitaPianteHa,
    kgSemiDefault: riferimentoAziendale.kgSemiHa,
  };

  useEffect(() => {
    fetch("/api/osservazioni")
      .then((r) => r.json())
      .then((data: Observation[]) => setOsservazioni(data))
      .catch(() => {})
      .finally(() => setLoadingOss(false));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PARAMETRI_AZIENDALI_STORAGE_KEY, JSON.stringify(parametriAziendali));
    } catch {
      // La calibrazione resta disponibile nella sessione anche se lo storage è disabilitato.
    }
  }, [parametriAziendali]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FINESTRE_DAS_GRANO_STORAGE_KEY, JSON.stringify(finestreDasGrano));
    } catch {
      // Le finestre restano utilizzabili nella sessione se lo storage è disabilitato.
    }
  }, [finestreDasGrano]);

  // Auto-fill resa, azoto e densità quando cambia la varietà.
  useEffect(() => {
    if (isGranoDuro) {
      const dati = GRANO_DURO_DB[varieta] ?? GRANO_DURO_DB.Redidenari;
      setResa(50);
      setAzotoTot(150);
      setDensitaUnita("kg/ha");
      setDensitaValore(dati.doseSemeKgHaDefault);
      return;
    }
    const dati = VARIETA_DB[varieta];
    const riferimento = parametriAziendali[varieta] ?? {
      densitaPianteHa: dati.densitaPianteDefault,
      kgSemiHa: dati.kgSemiDefault,
    };
    if (dati) {
      setResa(dati.resaDefault);
      setAzotoTot(dati.azotoDefault);
      setDensitaValore(densitaUnita === "piante/ha" ? riferimento.densitaPianteHa : riferimento.kgSemiHa);
    }
  }, [varieta, isGranoDuro]);

  const densita = useMemo(
    () => calcolaDensita(densitaValore, densitaUnita, datiVarieta),
    [densitaValore, densitaUnita, datiVarieta]
  );
  const densitaGrano = useMemo(
    () => calcolaDensitaGrano(densitaValore, densitaUnita, datiGrano),
    [densitaValore, densitaUnita, datiGrano]
  );
  const fabbisognoNBase = useMemo(
    () => isGranoDuro
      ? calcolaFabbisognoNGrano(resa, densitaGrano.fattoreAzoto).base
      : Math.round(resa * datiVarieta.kgNPerTon),
    [datiVarieta, densitaGrano.fattoreAzoto, isGranoDuro, resa]
  );
  // Formula: asportazione da resa × correzione moderata della densità colturale.
  const fabbisognoN = isGranoDuro
    ? Math.round(fabbisognoNBase * densitaGrano.fattoreAzoto)
    : Math.round(fabbisognoNBase * densita.fattoreAzoto);
  const azotoConsigliato = isGranoDuro
    ? fabbisognoN
    : resa > datiVarieta.resaMax
    ? fabbisognoN
    : Math.min(datiVarieta.azotoMax, Math.max(datiVarieta.azotoMin, fabbisognoN));
  const azotoAsportazioni = !isGranoDuro && resa > datiVarieta.resaMax ? azotoConsigliato : null;
  const aggiornaParametroAziendale = useCallback((
    campo: keyof ParametriAziendali,
    valore: number
  ) => {
    if (!Number.isFinite(valore) || valore <= 0) return;
    setParametriAziendali((correnti) => ({
      ...correnti,
      [varieta]: { ...correnti[varieta], [campo]: valore },
    }));
  }, [varieta]);
  const aggiornaFinestraDasGrano = useCallback((
    fase: FinestraDasLocale["fase"],
    campo: "dasMin" | "dasMax",
    valore: number,
  ) => {
    setFinestreDasGrano((correnti) => correnti.map((finestra) =>
      finestra.fase === fase
        ? { ...finestra, [campo]: Math.max(0, Math.round(valore)) }
        : finestra
    ));
  }, []);

  const cambiaDensitaUnita = useCallback((unita: DensitaUnita) => {
    if (unita === densitaUnita) return;
    const valoreEquivalente = isGranoDuro
      ? unita === "kg/ha"
        ? granoKgHaDaSemiMq(densitaGrano.semiMqEquivalenti, datiGrano)
        : unita === "semi/m²"
        ? densitaGrano.semiMqEquivalenti
        : densitaGrano.semiHaEquivalenti
      : unita === "piante/ha"
        ? densita.pianteHaEquivalenti
        : (densita.pianteHaEquivalenti / datiVarieta.densitaPianteDefault) * datiVarieta.kgSemiDefault;
    setDensitaUnita(unita);
    setDensitaValore(Number(valoreEquivalente.toFixed(unita === "piante/ha" || unita === "semi/ha" || unita === "semi/m²" ? 0 : 1)));
  }, [datiGrano, densita, densitaGrano, densitaUnita, datiVarieta, isGranoDuro]);

  // Auto-aggiorna il campo azoto quando la resa supera il massimo di disciplinare
  useEffect(() => {
    if (azotoAsportazioni !== null) {
      setAzotoTot(azotoAsportazioni);
    }
  }, [azotoAsportazioni]);

  const [errors, setErrors]             = useState<Record<string, string>>({});

  // Giorni auto-calcolati se c'è la data trapianto, altrimenti manuali
  const giorniAuto = useMemo(() => diffDays(dataTrapianto, data), [dataTrapianto, data]);
  const giorniInversi = useMemo(() => diffDays(data, dataTrapianto), [dataTrapianto, data]);
  const dataTrapiantoFutura = giorniInversi !== null && giorniInversi > 0;
  const giorni = giorniAuto ?? giorniManuale;
  const autoCalcolato = giorniAuto !== null;

  const faseStimataDas = stimaFaseGranoDaDas(giorni, finestreDasGrano);
  const faseGranoSelezionata = faseGranoDaBbch(bbchGrano);
  const faseGrano = faseGranoConfermataDaBbch(bbchGrano, bbchGranoConfermato);
  const fabbisognoGrano = calcolaFabbisognoNGrano(resa, densitaGrano.fattoreAzoto);
  const pianoNGrano = calcolaPianoNGrano({
    fabbisognoN: fabbisognoGrano.corretto,
    azotoGiaDistribuito,
    fase: faseGrano,
    das: giorni,
    lettureNdvi: [n1, n2, n3, n4, n5],
  });

  const risultati = calcola(
    resa, azotoTot, giorni, n1, n2, n3, n4, n5, fabbisognoN, etaPiantina
  );
  const risultatiGrano = {
    fase: faseGrano,
    fabbisognoBase: fabbisognoGrano.base,
    fabbisognoN: fabbisognoGrano.corretto,
    ...pianoNGrano,
  };

  const salvaOsservazione = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const trimmedId = obsId.trim();
    if (!trimmedId) newErrors.id = "Inserisci un ID valido.";
    else if (osservazioni.some((o) => o.id === trimmedId))
      newErrors.id = `ID "${trimmedId}" già utilizzato.`;
    if (!cliente.trim()) newErrors.cliente = "Campo obbligatorio.";
    if (!appezzamento.trim()) newErrors.appezzamento = "Campo obbligatorio.";
    if (densitaValore <= 0) newErrors.densita = "Inserisci una densità maggiore di zero.";
    if (dataTrapiantoFutura) newErrors.dataTrapianto = `La data di ${isGranoDuro ? "semina" : "trapianto"} è successiva al rilevamento.`;
    if (isGranoDuro && !dataTrapianto) newErrors.dataTrapianto = "Inserisci la data di semina per calcolare i DAS.";
    if (isGranoDuro && !faseGrano) {
      newErrors.bbch = faseGranoSelezionata
        ? "Conferma il rilievo BBCH in campo prima di salvare."
        : "Seleziona e conferma la fase BBCH rilevata in campo.";
    }
    if (!(isGranoDuro ? risultatiGrano.valoriValidi : risultati.valoriValidi)) {
      newErrors.ndvi = "Ogni lettura NDVI deve essere compresa tra 0 e 1.";
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setErrors({});
    const trimmedIdFinal = trimmedId;
    const num = parseInt(trimmedIdFinal);

    const doSave = (lat: number | null, lng: number | null) => {
      const nuova: Observation = {
        id: trimmedIdFinal,
        coltura,
        data,
        dataTrapianto: isGranoDuro ? "" : dataTrapianto,
        dataSemina: isGranoDuro ? dataTrapianto : "",
        giorni,
        etaPiantina,
        faseFenologica: isGranoDuro ? risultatiGrano.fase?.label : ndviOttimale(giorni, etaPiantina).label,
        bbch: isGranoDuro ? bbchGrano : null,
        faseFonte: isGranoDuro ? "BBCH confermato in campo" : null,
        cliente: cliente.trim(),
        appezzamento: appezzamento.trim(),
        resa,
        varieta,
        densitaValore,
        densitaUnita,
        pianteHaEquivalenti: Math.round(isGranoDuro ? densitaGrano.semiHaEquivalenti : densita.pianteHaEquivalenti),
        n1,
        n2,
        n3,
        n4,
        n5,
        ...(isGranoDuro
          ? {
              media: risultatiGrano.media,
              ottimale: risultatiGrano.ndviOttimale,
              discostamento: risultatiGrano.scostamentoNdvi,
              dose: risultatiGrano.quotaProposta,
              azotoTotale: risultatiGrano.fabbisognoN,
              azotoGiaDistribuito,
              quotaAzoto: risultatiGrano.quotaProposta,
            }
          : risultati),
        lat,
        lng,
      };
      fetch("/api/osservazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuova),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Salvataggio non riuscito.");
          return response.json();
        })
        .then(() => {
          setOsservazioni((prev) => [nuova, ...prev]);
          setObsId(isNaN(num) ? "" : String(num + 1));
        })
        .catch(() => setErrors((current) => ({
          ...current,
          save: "Impossibile salvare l’osservazione. Riprova tra qualche istante.",
        })));
    };

    if (navigator.geolocation) {
      let salvata = false;
      const saveOnce = (lat: number | null, lng: number | null) => {
        if (salvata) return;
        salvata = true;
        doSave(lat, lng);
      };
      const fallbackTimer = window.setTimeout(() => saveOnce(null, null), 1500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(fallbackTimer);
          saveOnce(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          window.clearTimeout(fallbackTimer);
          saveOnce(null, null);
        },
        { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
      );
    } else {
      doSave(null, null);
    }
  }, [obsId, coltura, data, dataTrapianto, giorni, etaPiantina, cliente, appezzamento, osservazioni, resa, varieta, densitaValore, densitaUnita, densita.pianteHaEquivalenti, densitaGrano.semiHaEquivalenti, n1, n2, n3, n4, n5, risultati, risultatiGrano, azotoGiaDistribuito, dataTrapiantoFutura, isGranoDuro, bbchGrano, bbchGranoConfermato, faseGrano, faseGranoSelezionata]);

  const eliminaOsservazione = useCallback((id: string) => {
    fetch(`/api/osservazioni/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(() => setOsservazioni((prev) => prev.filter((o) => o.id !== id)));
  }, []);

  const resetRegistro = useCallback(() => {
    if (!window.confirm("Sei sicuro di voler cancellare tutto il registro? L'operazione è irreversibile.")) return;
    fetch("/api/osservazioni", { method: "DELETE" })
      .then(() => setOsservazioni([]));
  }, []);

  const esportaPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Logo (convert img URL → base64 via canvas)
    const img = new Image();
    img.src = taurusLogo;
    const drawDoc = () => {
      const logoW = 28, logoH = 28;
      try { doc.addImage(img, "PNG", 10, 8, logoW, logoH); } catch (_) { /* skip if fails */ }

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(22, 101, 52); // green-800
      doc.text("Taurus Agriculture Solution", 42, 18);
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text("Registro NDVI Tabacco", 42, 26);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Esportato il: ${new Date().toLocaleDateString("it-IT")}  —  ${osservazioni.length} osservazion${osservazioni.length === 1 ? "e" : "i"}`, 42, 33);

      // Separator line
      doc.setDrawColor(22, 101, 52);
      doc.setLineWidth(0.5);
      doc.line(10, 39, 287, 39);

      autoTable(doc, {
        startY: 43,
        head: [[
          "ID", "Rilev.", "Trapianto", "Cliente", "Appezz.", "Gg",
          "M1", "M2", "M3", "M4", "M5",
          "Media", "Ottimale", "Diff.", "Dose\n(kg/ha)", "Lat", "Lng",
        ]],
        body: osservazioni.map((o) => [
          o.id,
          o.data,
          o.dataTrapianto || "—",
          o.cliente,
          o.appezzamento,
          o.giorni,
          o.n1.toFixed(2), o.n2.toFixed(2), o.n3.toFixed(2), o.n4.toFixed(2), o.n5.toFixed(2),
          o.media.toFixed(3),
          o.ottimale.toFixed(3),
          o.discostamento.toFixed(3),
          o.dose.toFixed(1),
          o.lat != null ? o.lat.toFixed(6) : "—",
          o.lng != null ? o.lng.toFixed(6) : "—",
        ]),
        styles: { fontSize: 7.5, cellPadding: 2, halign: "center" },
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [242, 247, 243] },
        columnStyles: {
          0:  { fontStyle: "bold", textColor: [22, 101, 52] },
          3:  { halign: "left" },
          4:  { halign: "left" },
          15: { fontStyle: "bold" },
        },
        didParseCell: (data) => {
          // Highlight dose > 0 in red
          if (data.section === "body" && data.column.index === 15) {
            const val = parseFloat(String(data.cell.raw));
            if (val > 0) data.cell.styles.textColor = [185, 28, 28];
            else data.cell.styles.textColor = [22, 101, 52];
          }
        },
        margin: { left: 10, right: 10 },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `Pagina ${i} di ${pageCount}  —  Calcolatore NDVI Tabacco · Taurus Agriculture Solution`,
          148.5, 205, { align: "center" }
        );
      }

      doc.save(`NDVI_Tabacco_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    if (img.complete) { drawDoc(); }
    else { img.onload = drawDoc; img.onerror = drawDoc; }
  }, [osservazioni]);

  const doseColor =
    risultati.dose === 0 ? "text-green-700"
    : risultati.dose > 50 ? "text-red-700"
    : "text-amber-600";

  const ndviInfo = ndviOttimale(giorni, etaPiantina);
  const etaFenologiaLabel = ETA_GIORNI_EQUIVALENTI[etaPiantina] > 0
    ? ` · +${ETA_GIORNI_EQUIVALENTI[etaPiantina]} gg fenologici per piantina ${ETA_PIANTINA_LABELS[etaPiantina].label.toLowerCase()}`
    : "";
  const ndviOttimaleNote = `Curva continua · ${ndviInfo.label} · ${risultati.giorniFenologici} gg fenologici → NDVI ottimale ${risultati.ottimale.toFixed(3)}${etaFenologiaLabel}`;
  const variabilitaClass =
    risultati.statoVariabilita === "bassa" ? "bg-green-50 border-green-200 text-green-800"
    : risultati.statoVariabilita === "moderata" ? "bg-amber-50 border-amber-200 text-amber-800"
    : "bg-red-50 border-red-200 text-red-800";
  const azotoClass =
    risultati.statoAzoto === "allineato" ? "text-green-700"
    : risultati.statoAzoto === "deficit" ? "text-amber-700"
    : "text-red-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <img src={taurusLogo} alt="Taurus Agriculture Solution" className="h-28 w-auto drop-shadow-md" />
          <h1 className="text-3xl font-bold text-green-900">{isGranoDuro ? "Pianificatore azoto grano duro" : "Calcolatore NDVI Tabacco"}</h1>
          <p className="text-green-700 mt-0.5 text-sm">Strumento di supporto alla fertilizzazione azotata</p>
        </div>

        {/* Tab navigation */}
        <div className="flex rounded-xl overflow-hidden border border-green-200 shadow-sm">
          {(["calcolatore", "elaborazioni"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-green-800 text-white"
                  : "bg-white text-green-800 hover:bg-green-50"
              }`}
            >
              {tab === "calcolatore" ? isGranoDuro ? "🌾 Pianificatore azoto" : "🌿 Calcolatore NDVI" : "🗺 Elaborazioni e Mappe"}
            </button>
          ))}
        </div>

        {activeTab === "elaborazioni" && (
          <ElaborazioniMappe osservazioni={osservazioni} />
        )}

        {/* Input Card — shown only in calcolatore tab */}
        {activeTab === "calcolatore" && <>

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5 border border-stone-200">

          {/* — Anagrafica — */}
          <h2 className="text-lg font-bold text-green-900 border-b border-stone-100 pb-2">Anagrafica</h2>
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="ID Osservazione" value={obsId}
              onChange={(v) => { setObsId(v); setErrors((e) => ({ ...e, id: "" })); }}
              placeholder="es. 1, OBS-01…" error={errors.id} />
            <DateInput label="Data Rilevamento" value={data} onChange={setData} />
            <TextInput label="Cliente (nome azienda)" value={cliente}
              onChange={(v) => { setCliente(v); setErrors((e) => ({ ...e, cliente: "" })); }}
              placeholder="es. Az. Agr. Rossi" error={errors.cliente} />
            <TextInput label="Appezzamento" value={appezzamento}
              onChange={(v) => { setAppezzamento(v); setErrors((e) => ({ ...e, appezzamento: "" })); }}
              placeholder="es. Parcella A, Campo Nord" error={errors.appezzamento} />

          </div>

          {/* — Parametri Colturali — */}
          <h2 className="text-lg font-bold text-green-900 border-b border-stone-100 pb-2">Parametri Colturali</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">Coltura</label>
              <select
                aria-label="Coltura"
                value={coltura}
                onChange={(event) => {
                  const nuovaColtura = event.target.value as Coltura;
                  setColtura(nuovaColtura);
                  setVarieta(nuovaColtura === "grano duro" ? "Redidenari" : "Burley (Non Cimato)");
                  setDensitaUnita(nuovaColtura === "grano duro" ? "kg/ha" : "piante/ha");
                  setBbchGrano("");
                  setBbchGranoConfermato(false);
                  setErrors({});
                }}
                className={inputCls}
              >
                <option value="tabacco">Tabacco</option>
                <option value="grano duro">Grano duro</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">Varietà</label>
              <select value={varieta} onChange={(e) => setVarieta(e.target.value)} className={inputCls}>
                {(isGranoDuro ? Object.values(GRANO_DURO_DB) : Object.values(VARIETA_DB)).map((v) => (
                  <option key={v.label} value={v.label}>
                    {isGranoDuro
                      ? `${v.label} · ${(v as GranoVarietaDati).densitaSemiMqMin}${(v as GranoVarietaDati).densitaSemiMqMin === (v as GranoVarietaDati).densitaSemiMqMax ? "" : `–${(v as GranoVarietaDati).densitaSemiMqMax}`} semi/m²`
                      : `${v.label} — ${(v as VarietaDati).categoria} · resa ${(v as VarietaDati).resaMin}–${(v as VarietaDati).resaMax} t/ha`}
                  </option>
                ))}
              </select>
              {isGranoDuro ? (
                <p className="text-xs text-stone-400">
                  Disciplinare: {datiGrano.densitaSemiMqMin}{datiGrano.densitaSemiMqMin === datiGrano.densitaSemiMqMax ? "" : `–${datiGrano.densitaSemiMqMax}`} semi/m² · {datiGrano.doseSemeKgHaMin}{datiGrano.doseSemeKgHaMin === datiGrano.doseSemeKgHaMax ? "" : `–${datiGrano.doseSemeKgHaMax}`} kg seme/ha.
                </p>
              ) : (
                <p className="text-xs text-stone-400">
                  {datiVarieta.categoria} · azoto consigliato {datiVarieta.azotoMin}–{datiVarieta.azotoMax} kg/ha · resa max {datiVarieta.resaMax} t/ha
                </p>
              )}
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">{isGranoDuro ? "Densità di semina" : "Piante / semi per ettaro"}</label>
              <div className="grid grid-cols-[1fr_9rem] gap-2">
                <input
                  type="number"
                  aria-label={isGranoDuro ? "Densità di semina" : "Piante o semi per ettaro"}
                  value={densitaValore}
                  min={densitaUnita === "kg/ha" ? 0.1 : densitaUnita === "semi/m²" ? 1 : 1000}
                  step={densitaUnita === "kg/ha" ? 0.1 : densitaUnita === "semi/m²" ? 1 : 100}
                  onChange={(event) => {
                    setDensitaValore(parseFloat(event.target.value) || 0);
                    setErrors((current) => ({ ...current, densita: "" }));
                  }}
                  className={`${inputCls} ${errors.densita ? "border-red-400 focus:ring-red-400" : ""}`}
                />
                <select aria-label="Unità densità" value={densitaUnita} onChange={(event) => cambiaDensitaUnita(event.target.value as DensitaUnita)} className={inputCls}>
                  {isGranoDuro ? <>
                    <option value="kg/ha">kg seme/ha</option>
                    <option value="semi/m²">semi/m²</option>
                    <option value="semi/ha">semi/ha</option>
                  </> : <option value="piante/ha">piante/ha</option>}
                  {!isGranoDuro && <option value="kg/ha">kg seme/ha</option>}
                </select>
              </div>
              {errors.densita ? (
                <p className="text-xs text-red-600">{errors.densita}</p>
              ) : (
                isGranoDuro ? (
                  <p className={densitaGrano.fuoriRange ? "text-xs font-medium text-amber-700" : "text-xs text-stone-500"}>
                    Input: {densitaUnita === "kg/ha"
                      ? `${densitaValore.toFixed(1)} kg seme/ha`
                      : `${Math.round(densitaGrano.semiMqEquivalenti).toLocaleString("it-IT")} semi/m²`}
                    {" "}· disciplinare: {datiGrano.doseSemeKgHaMin}–{datiGrano.doseSemeKgHaMax} kg/ha e {datiGrano.densitaSemiMqMin}–{datiGrano.densitaSemiMqMax} semi/m².
                    {" "}Equivalente stimato: {Math.round(densitaGrano.semiHaEquivalenti).toLocaleString("it-IT")} semi/ha ({densitaGrano.semiMqEquivalenti.toFixed(0)} semi/m²) · coefficiente densità N: ×{densitaGrano.fattoreAzoto.toFixed(2)}
                    {densitaGrano.fuoriRange
                      ? densitaUnita === "kg/ha"
                        ? " · Fuori dal range di dose del disciplinare: verifica quantità e varietà."
                        : " · Fuori dal range di densità del disciplinare: verifica semi e varietà."
                      : ""}
                  </p>
                ) : (
                  <p className="text-xs text-stone-400">
                    Equivalente aziendale: {Math.round(densita.pianteHaEquivalenti).toLocaleString("it-IT")} piante/ha · riferimento: {datiVarieta.densitaPianteDefault.toLocaleString("it-IT")} piante/ha · conversione: {Math.round(datiVarieta.densitaPianteDefault / datiVarieta.kgSemiDefault).toLocaleString("it-IT")} piante/kg · coefficiente densità azoto: ×{densita.fattoreAzoto.toFixed(2)}
                  </p>
                )
              )}
            </div>
            {!isGranoDuro && <div className="col-span-2 rounded-xl border border-green-200 bg-green-50/60 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-green-900">Parametri aziendali confermati</h3>
                  <p className="text-xs text-green-800 mt-0.5">
                    Sono la base della conversione e del correttivo di densità per la varietà selezionata.
                    Le modifiche vengono mantenute su questo dispositivo.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-green-700 border border-green-200">
                  {varieta}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="Densità di riferimento (piante/ha)"
                  value={riferimentoAziendale.densitaPianteHa}
                  onChange={(value) => aggiornaParametroAziendale("densitaPianteHa", value)}
                  step={100}
                  min={1000}
                />
                <NumberInput
                  label="Seme di riferimento (kg/ha)"
                  value={riferimentoAziendale.kgSemiHa}
                  onChange={(value) => aggiornaParametroAziendale("kgSemiHa", value)}
                  step={0.0001}
                  min={0.0001}
                />
              </div>
              <p className="text-xs text-green-800">
                Conversione confermata: <strong>{Math.round(riferimentoAziendale.densitaPianteHa / riferimentoAziendale.kgSemiHa).toLocaleString("it-IT")} piante per kg di seme</strong>.
                Questo rapporto sostituisce il valore generico quando usi kg seme/ha.
              </p>
            </div>}
            {!isGranoDuro && <div className="col-span-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <details>
                <summary className="cursor-pointer text-sm font-bold text-stone-700">
                  Vedi i riferimenti aziendali di tutte le varietà
                </summary>
                <div className="overflow-x-auto mt-3">
                  <table className="w-full min-w-[560px] text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-left text-stone-500">
                        <th className="px-2 py-2">Varietà</th>
                        <th className="px-2 py-2 text-right">Piante/ha</th>
                        <th className="px-2 py-2 text-right">kg seme/ha</th>
                        <th className="px-2 py-2 text-right">Piante/kg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(VARIETA_DB).map((voce) => {
                        const riferimento = parametriAziendali[voce.label] ?? {
                          densitaPianteHa: voce.densitaPianteDefault,
                          kgSemiHa: voce.kgSemiDefault,
                        };
                        return (
                          <tr key={voce.label} className={`border-b border-stone-100 last:border-0 ${voce.label === varieta ? "bg-green-100/70 font-semibold" : ""}`}>
                            <td className="px-2 py-2">{voce.label}</td>
                            <td className="px-2 py-2 text-right font-mono">{Math.round(riferimento.densitaPianteHa).toLocaleString("it-IT")}</td>
                            <td className="px-2 py-2 text-right font-mono">{riferimento.kgSemiHa.toFixed(4)}</td>
                            <td className="px-2 py-2 text-right font-mono">{Math.round(riferimento.densitaPianteHa / riferimento.kgSemiHa).toLocaleString("it-IT")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-stone-500 mt-2">
                  La riga evidenziata è la varietà in uso. Aggiorna i due valori sopra quando l’azienda conferma una nuova densità o dose di seme.
                </p>
              </details>
            </div>}
            <NumberInput
              label={isGranoDuro ? "Resa desiderata (q/ha)" : "Resa Desiderata (t/ha)"}
              value={resa}
              onChange={setResa}
              step={isGranoDuro ? 1 : 0.1}
              min={isGranoDuro ? 1 : 0.1}
              warning={
                !isGranoDuro && resa > datiVarieta.resaMax
                  ? `Supera il limite massimo di ${datiVarieta.resaMax} t/ha per questa varietà`
                  : isGranoDuro && (resa < 40 || resa > 60)
                  ? "La tabella disciplinare riporta riferimenti tra 40 e 60 q/ha; il calcolo resta lineare a 3 kg N/q."
                  : undefined
              }
              hint={isGranoDuro ? "Tabella disciplinare: 40 q/ha = 120, 50 = 150, 60 = 180 kg N/ha." : `Range consigliato: ${datiVarieta.resaMin}–${datiVarieta.resaMax} t/ha`}
            />
            <div className="flex flex-col gap-2">
              <NumberInput
                label={isGranoDuro ? "Fabbisogno azoto totale calcolato" : "Kg Azoto Totale"}
                value={isGranoDuro ? fabbisognoN : azotoTot}
                onChange={setAzotoTot}
                min={0}
                readonly={isGranoDuro}
                warning={
                  isGranoDuro
                    ? undefined
                    : azotoAsportazioni !== null
                    ? `Asportazioni corrette per densità: ${fabbisognoNBase} × ${densita.fattoreAzoto.toFixed(2)} = ${azotoAsportazioni} kg/ha`
                    : undefined
                }
                hint={
                  isGranoDuro
                    ? `Fabbisogno: ${fabbisognoNBase} kg N/ha × densità ${densitaGrano.fattoreAzoto.toFixed(2)} = ${fabbisognoN} kg N/ha`
                    : azotoAsportazioni === null && datiVarieta
                    ? `Consiglio: ${azotoConsigliato} kg N/ha · resa ${resa.toFixed(1)} × ${datiVarieta.kgNPerTon} kg N/t × densità ${densita.fattoreAzoto.toFixed(2)}`
                    : undefined
                }
              />
              {!isGranoDuro && <button
                type="button"
                onClick={() => setAzotoTot(azotoConsigliato)}
                className="w-full rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800 transition-colors hover:bg-green-100"
              >
                Usa azoto consigliato: {azotoConsigliato} kg/ha
              </button>}
            </div>

            {isGranoDuro && <NumberInput
              label="Azoto già distribuito (kg N/ha)"
              value={azotoGiaDistribuito}
              onChange={setAzotoGiaDistribuito}
              step={1}
              min={0}
              hint="Totale degli apporti già effettuati dall'inizio della coltura: viene sottratto dal fabbisogno del piano."
            />}

            {isGranoDuro && (
              <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 space-y-2">
                <p className="font-bold">Correttivo densità dichiarato</p>
                <p>
                  Il fabbisogno base segue la tabella del disciplinare (3 kg N per quintale atteso). La densità modifica questo valore solo in modo limitato:
                  coefficiente da ×0,90 a ×1,10, calcolato rispetto a {datiGrano.densitaSemiMqDefault} semi/m².
                </p>
                <p>
                  Il PMG di riferimento ({datiGrano.pesoMilleSemiG.toFixed(1)} g) serve solo per convertire kg/ha e semi/m²:
                  il disciplinare non dichiara un PMG, quindi la dose inserita viene verificata direttamente nel proprio intervallo kg/ha.
                </p>
                <p className="font-medium">
                  Restano necessarie le valutazioni tecniche su analisi del suolo, coltura precedente, piogge e azoto residuo: l’app non applica correzioni automatiche per questi fattori.
                </p>
              </div>
            )}

            {/* Data trapianto / semina — occupa tutta la larghezza */}
            <div className="col-span-2">
              <DateInput
                label={isGranoDuro ? "Data semina" : "Data Trapianto"}
                value={dataTrapianto}
                onChange={(value) => { setDataTrapianto(value); setErrors((current) => ({ ...current, dataTrapianto: "" })); }}
                hint={dataTrapianto ? undefined : isGranoDuro ? "Obbligatoria — calcola automaticamente i giorni dalla semina (DAS)" : "Opzionale — se inserita calcola i giorni in automatico"}
                warning={errors.dataTrapianto || (dataTrapiantoFutura ? `Non può essere successiva alla data di rilevamento.` : undefined)}
              />
            </div>

            {isGranoDuro && <div className="col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-blue-950">Fase fenologica: conferma BBCH</h3>
                <p className="text-xs text-blue-900 mt-0.5">
                  I DAS sono una stima locale: seleziona il BBCH osservato in campo prima di usare la quota azotata.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-stone-700">BBCH rilevato in campo</label>
                  <select
                    aria-label="BBCH rilevato"
                    value={bbchGrano}
                    onChange={(event) => {
                      setBbchGrano(event.target.value);
                      setBbchGranoConfermato(false);
                      setErrors((current) => ({ ...current, bbch: "" }));
                    }}
                    className={`${inputCls} ${errors.bbch ? "border-red-400 focus:ring-red-400" : ""}`}
                  >
                    <option value="">Seleziona il BBCH rilevato…</option>
                    {FASI_GRANO.map((fase) => (
                      <option key={fase.bbch} value={fase.bbch}>{fase.bbch} · {fase.label}</option>
                    ))}
                  </select>
                  {errors.bbch && <p className="text-xs text-red-600">{errors.bbch}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={!faseStimataDas}
                    onClick={() => {
                      if (!faseStimataDas) return;
                      setBbchGrano(faseStimataDas.bbch);
                      setBbchGranoConfermato(false);
                      setErrors((current) => ({ ...current, bbch: "" }));
                    }}
                    className="rounded-lg border border-blue-300 bg-white px-3 py-2.5 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Proponi da stima DAS{faseStimataDas ? ` · ${faseStimataDas.bbch}` : ""}
                  </button>
                  <button
                    type="button"
                    disabled={!faseGranoSelezionata || bbchGranoConfermato}
                    onClick={() => {
                      setBbchGranoConfermato(true);
                      setErrors((current) => ({ ...current, bbch: "" }));
                    }}
                    className="rounded-lg border border-green-700 bg-green-800 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-green-900 disabled:cursor-not-allowed disabled:border-stone-300 disabled:bg-stone-300"
                  >
                    {bbchGranoConfermato ? "BBCH confermato" : "Conferma rilievo BBCH"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-blue-900">
                {faseStimataDas
                  ? <>Stima DAS locale: <strong>{giorni} DAS → {faseStimataDas.bbch} · {faseStimataDas.label}</strong>. Può solo precompilare il selettore: verifica in campo e usa “Conferma rilievo BBCH” per attivare la quota.</>
                  : <>Nessuna fase stimata per {giorni} DAS nelle finestre locali configurate: rileva e seleziona il BBCH in campo.</>}
              </p>
              {bbchGrano && !bbchGranoConfermato && (
                <p className="text-xs font-semibold text-amber-800">BBCH selezionato ma non confermato: quota azotata e salvataggio della fase restano bloccati.</p>
              )}
              {faseGrano && (
                <p className="text-xs font-semibold text-green-800">Rilievo confermato: {faseGrano.bbch} · {faseGrano.label}.</p>
              )}
            </div>}

            {isGranoDuro && <div className="col-span-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <details>
                <summary className="cursor-pointer text-sm font-bold text-stone-700">
                  Calendario fenologico di riferimento · 30 ottobre → 7 luglio
                </summary>
                <p className="mt-2 text-xs text-stone-600">
                  Profilo indicativo per semina autunnale fino alla maturazione cerosa/fisiologica (circa 250 DAS).
                  Le finestre DAS servono a orientare il rilievo: il BBCH osservato e confermato resta l’unica fonte per la quota.
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead><tr className="border-b border-stone-200 text-left text-stone-500">
                      <th className="px-2 py-2">DAS stimati</th><th className="px-2 py-2">BBCH</th><th className="px-2 py-2">Fase</th><th className="px-2 py-2">Esigenza N</th>
                    </tr></thead>
                    <tbody>
                      {PROFILO_FENOLOGICO_GRANO.map((tappa) => (
                        <tr key={tappa.bbch} className="border-b border-stone-100 last:border-0">
                          <td className="px-2 py-2 font-mono">{tappa.dasMin}–{tappa.dasMax}</td>
                          <td className="px-2 py-2 font-mono">{tappa.bbch}</td>
                          <td className="px-2 py-2">{tappa.label}</td>
                          <td className="px-2 py-2">{tappa.quotaAzotoPrevista ? "quota di fase prevista" : "nessuna quota automatica"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>}

            {isGranoDuro && <div className="col-span-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <details>
                <summary className="cursor-pointer text-sm font-bold text-stone-700">
                  Configura le finestre DAS locali per proporre il BBCH
                </summary>
                <p className="mt-2 text-xs text-stone-600">
                  Sono una preimpostazione modificabile salvata su questo dispositivo; non sono soglie ufficiali del disciplinare e non sostituiscono il rilievo BBCH.
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {finestreDasGrano.map((finestra) => (
                    <div key={finestra.fase} className="rounded-lg border border-stone-200 bg-white p-3">
                      <p className="text-xs font-semibold text-stone-800">{finestra.fase}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <NumberInput
                          label="DAS da"
                          value={finestra.dasMin}
                          onChange={(value) => aggiornaFinestraDasGrano(finestra.fase, "dasMin", value)}
                          min={0}
                          step={1}
                        />
                        <NumberInput
                          label="DAS a"
                          value={finestra.dasMax ?? 0}
                          onChange={(value) => aggiornaFinestraDasGrano(finestra.fase, "dasMax", value)}
                          min={finestra.dasMin}
                          step={1}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>}

            {/* Età Piantina al Trapianto */}
            {!isGranoDuro && <div className="col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-stone-700">
                Età Piantina al Trapianto
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ETA_PIANTINA_LABELS) as EtaPiantina[]).map((key) => (
                  <label
                    key={key}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-center
                      ${etaPiantina === key
                        ? "bg-green-800 text-white border-green-800"
                        : "bg-white text-stone-700 border-stone-300 hover:border-green-700"}`}
                  >
                    <input
                      type="radio"
                      name="etaPiantina"
                      value={key}
                      checked={etaPiantina === key}
                      onChange={() => setEtaPiantina(key)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold">{ETA_PIANTINA_LABELS[key].label}</span>
                    <span className={`text-xs ${etaPiantina === key ? "text-green-200" : "text-stone-400"}`}>
                      {ETA_PIANTINA_LABELS[key].giorni}
                    </span>
                    {key !== "standard" && (
                      <span className={`text-xs font-mono font-bold ${etaPiantina === key ? "text-green-100" : "text-green-700"}`}>
                        +{ETA_GIORNI_EQUIVALENTI[key]} gg fenologici
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>}

            {/* Giorni dal trapianto / DAS — auto o manuale */}
            <div className="col-span-2 sm:col-span-1">
              <NumberInput
                label={isGranoDuro ? "DAS · giorni dalla semina" : "Giorni dal Trapianto"}
                value={giorni}
                onChange={setGiorniManuale}
                min={isGranoDuro ? 0 : 1}
                max={isGranoDuro ? 250 : 120}
                readonly={autoCalcolato}
                hint={
                  isGranoDuro
                    ? autoCalcolato
                      ? `Calcolato dalla data di semina · stima locale: ${faseStimataDas ? `${faseStimataDas.bbch} · ${faseStimataDas.label}` : "nessuna"}`
                      : "Inserisci la data di semina per calcolare i DAS; la fase resta da confermare con BBCH."
                    : autoCalcolato
                    ? `Calcolato dalla data trapianto · equivalenti: ${risultati.giorniFenologici} gg · NDVI ref: ${risultati.ottimale.toFixed(3)}`
                    : `Giorni fenologici equivalenti: ${risultati.giorniFenologici} · NDVI ref: ${risultati.ottimale.toFixed(3)}`
                }
              />
            </div>
          </div>

          {/* — Letture NDVI — */}
          <><h2 className="text-lg font-bold text-green-900 border-b border-stone-100 pb-2">
            {isGranoDuro ? "Letture NDVI del punto grano" : "Letture NDVI"}
          </h2>
          {isGranoDuro && <p className="text-xs text-stone-500 -mt-3">
            Inserisci cinque letture rappresentative del punto. La media modula prudentemente la quota BBCH, ma non diagnostica da sola una carenza di azoto.
          </p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumberInput label="Misura 1" value={n1} onChange={setN1} step={0.01} min={0} max={1} />
            <NumberInput label="Misura 2" value={n2} onChange={setN2} step={0.01} min={0} max={1} />
            <NumberInput label="Misura 3" value={n3} onChange={setN3} step={0.01} min={0} max={1} />
            <NumberInput label="Misura 4" value={n4} onChange={setN4} step={0.01} min={0} max={1} />
            <NumberInput label="Misura 5" value={n5} onChange={setN5} step={0.01} min={0} max={1} />
          </div>
          {errors.ndvi && <p className="text-xs font-medium text-red-600">{errors.ndvi}</p>}
          </>

          {/* — Risultati — */}
          {!isGranoDuro ? <div className="bg-green-50 border-l-4 border-green-700 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-green-900 mb-1">Risultati</h2>
            <div className="text-xs text-green-800 bg-green-100 rounded-lg px-3 py-2 space-y-1">
              <div className="font-semibold">📐 {ndviOttimaleNote}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-green-700 font-mono pt-0.5">
                {NDVI_FASI.map((f) => {
                  const riferimento = ndviOttimale(f.giorni, etaPiantina).ottimale;
                  const isActive = f.label === ndviInfo.label;
                  return (
                    <span
                      key={f.label}
                      className={`whitespace-nowrap ${isActive ? "font-bold underline underline-offset-2" : "opacity-60"}`}
                    >
                      {f.label}: {riferimento.toFixed(2)}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <ResultRow label="Media NDVI" value={risultati.media.toFixed(3)} />
              <ResultRow label="NDVI Ottimale" value={risultati.ottimale.toFixed(3)} highlight />
              <ResultRow label="Discostamento" value={risultati.discostamento.toFixed(3)} />
            </div>
            <div className={`rounded-lg border px-3 py-2 text-xs space-y-1 ${variabilitaClass}`}>
              {!risultati.valoriValidi ? (
                <p className="font-semibold">Inserisci valori NDVI compresi tra 0 e 1 prima di usare il risultato.</p>
              ) : (
                <>
                  <p className="font-semibold">
                    Variabilità NDVI: {risultati.statoVariabilita === "bassa" ? "bassa — media rappresentativa"
                      : risultati.statoVariabilita === "moderata" ? "moderata — utile una verifica in campo"
                      : "alta — la media non descrive bene l’appezzamento"}
                  </p>
                  <p>Varianza {risultati.varianza.toFixed(4)} · deviazione standard {risultati.deviazioneStandard.toFixed(3)} · CV {risultati.coefficienteVariazione.toFixed(1)}%</p>
                </>
              )}
            </div>
            <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs space-y-1">
              <p className="font-semibold text-stone-700">Coerenza resa e azoto</p>
              <p>
                Densità: <strong>{Math.round(densita.pianteHaEquivalenti).toLocaleString("it-IT")} piante/ha</strong>
                {" "}· resa: <strong>{resa.toFixed(1)} t/ha</strong> · asportazione base: {fabbisognoNBase} kg N/ha
                {" "}× densità {densita.fattoreAzoto.toFixed(2)} = <strong>{risultati.fabbisognoN} kg N/ha</strong>.
                {" "}Azoto inserito: <strong>{azotoTot} kg/ha</strong>.
              </p>
              <p className={`font-medium ${azotoClass}`}>
                {risultati.statoAzoto === "allineato"
                  ? `Bilancio coerente (${Math.round(risultati.rapportoAzoto * 100)}% del fabbisogno stimato).`
                  : risultati.statoAzoto === "deficit"
                  ? `Possibile deficit: mancano circa ${Math.max(0, risultati.fabbisognoN - azotoTot)} kg N/ha rispetto alle asportazioni stimate.`
                  : `Possibile eccesso: +${Math.max(0, azotoTot - risultati.fabbisognoN)} kg N/ha rispetto alle asportazioni stimate.`}
              </p>
              {risultati.statoVariabilita === "alta" && (
                <p className="text-red-700 font-medium">Con CV superiore al 15%, ricampiona le zone disomogenee prima di distribuire una dose uniforme.</p>
              )}
            </div>
            <div className="border-t border-green-200 pt-3 flex items-center justify-between">
              <span className="font-semibold text-stone-700">Da Distribuire:</span>
              <span className={`text-2xl font-bold ${doseColor}`}>
                {risultati.dose.toFixed(1)}{" "}
                <span className="text-base font-semibold text-stone-500">kg/ha</span>
              </span>
            </div>
          </div> : (
            <div className="bg-green-50 border-l-4 border-green-700 rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-green-900">Piano azoto del punto · grano duro</h2>
                <p className="text-xs text-green-800 mt-1">Resa e densità definiscono il piano; BBCH confermato e NDVI del punto definiscono la quota proponibile ora.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <ResultRow label="Fabbisogno base" value={`${risultatiGrano.fabbisognoBase} kg N/ha`} />
                <ResultRow label="Fabbisogno corretto" value={`${risultatiGrano.fabbisognoN} kg N/ha`} highlight />
                <ResultRow label="N già distribuito" value={`${azotoGiaDistribuito} kg N/ha`} />
                <ResultRow label="N residuo del piano" value={`${risultatiGrano.residuoPiano} kg N/ha`} highlight />
                <ResultRow label="NDVI medio punto" value={risultatiGrano.media.toFixed(3)} />
                <ResultRow label="NDVI riferimento" value={risultatiGrano.ndviOttimale.toFixed(3)} />
                <ResultRow label="BBCH confermato" value={faseGrano ? faseGrano.bbch : "da confermare"} highlight />
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-3 text-xs text-stone-700 space-y-1">
                {faseGrano ? <>
                  <p className="font-semibold text-green-900">Dose proponibile ora: {risultatiGrano.quotaProposta} kg N/ha</p>
                  <p>
                    Schema disciplinare per {faseGrano.bbch} · {faseGrano.label}: {faseGrano.azotoMin}–{faseGrano.azotoMax} kg N/ha.
                    Quota base: {risultatiGrano.quotaBase} kg N/ha; modulazione NDVI: ×{risultatiGrano.fattoreNdvi.toFixed(2)}; il risultato resta limitato all'intervallo della fase e ai {risultatiGrano.residuoPiano} kg N/ha residui.
                  </p>
                </> : (
                  <p className="font-semibold text-amber-800">
                    Rileva e conferma il BBCH in campo per ottenere la quota azotata della fase corretta.
                  </p>
                )}
                {!risultatiGrano.valoriValidi && <p className="font-semibold text-red-700">Inserisci tutte le letture NDVI tra 0 e 1 prima di usare il consiglio.</p>}
                {risultatiGrano.scostamentoNdvi > 0 && risultatiGrano.valoriValidi && (
                  <p className="font-semibold text-amber-800">
                    NDVI sotto il riferimento di {risultatiGrano.scostamentoNdvi.toFixed(3)}: verifica in campo prima della distribuzione. Il divario può dipendere anche da acqua, suolo, malattie o disuniformità, non solo dall'azoto.
                  </p>
                )}
                {risultatiGrano.coefficienteVariazione > 15 && risultatiGrano.valoriValidi && (
                  <p className="font-semibold text-amber-800">
                    Variabilità NDVI elevata: ricampiona le zone disomogenee prima di distribuire una dose uniforme.
                  </p>
                )}
                {(risultatiGrano.fabbisognoN < 127 || risultatiGrano.fabbisognoN > 176) && (
                  <p className="font-medium text-amber-800">
                    Il totale calcolato è fuori dalla somma degli intervalli di riferimento (127–176 kg N/ha): conferma il frazionamento con il tecnico aziendale.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {FASI_GRANO.map((fase) => {
                  const attiva = fase.label === faseGrano?.label;
                  return <div key={fase.label} className={`rounded-lg border p-2 ${attiva ? "border-green-600 bg-green-100 text-green-950 font-semibold" : "border-stone-200 bg-white text-stone-600"}`}>
                    {fase.bbch} · {fase.label} · {fase.azotoMin}–{fase.azotoMax} kg N/ha
                  </div>;
                })}
              </div>
              <details className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
                <summary className="cursor-pointer font-semibold">Metodo e limiti del riferimento NDVI</summary>
                <div className="mt-2 space-y-2">
                  <p>La curva NDVI è una baseline fenologica per semina autunnale, non una soglia universale. Corregge la quota BBCH solo entro ±15%, senza superare il residuo del piano.</p>
                  <p>Riferimenti: Akmal et al., <em>Sustainability</em> 2021 (NDVI e SPAD nel frumento duro); Denora et al., <em>PLOS ONE</em> 2022 (zone di gestione e N a dose variabile nel frumento duro); Nino et al., <em>Remote Sensing Applications</em> 2024 (stato azotato da Sentinel-2 in Italia centrale).</p>
                  <p className="font-medium">A copertura elevata l'NDVI può saturare; non distingue autonomamente carenza di N da stress idrico, suolo, patogeni o altre cause. Conferma sempre con osservazione e valutazione tecnica.</p>
                </div>
              </details>
            </div>
          )}

          <button onClick={salvaOsservazione}
            className="w-full bg-green-800 hover:bg-green-900 active:bg-green-950 text-white font-bold py-3.5 rounded-xl text-base transition-colors">
            💾 Salva Osservazione
          </button>
          {errors.save && <p className="text-sm font-medium text-red-600">{errors.save}</p>}
        </div>

        {/* Registro */}
        {osservazioni.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-green-900">Registro Osservazioni</h2>
                <span className="text-sm text-stone-400">{osservazioni.length} record</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetRegistro}
                  className="flex items-center gap-2 bg-white hover:bg-red-50 active:bg-red-100 text-red-600 border border-red-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  🗑 Reset Registro
                </button>
                <button
                  onClick={() => exportObservationsCsv(osservazioni)}
                  className="flex items-center gap-2 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-700 border border-stone-300 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  📊 Esporta CSV
                </button>
                <button
                  onClick={esportaPDF}
                  className="flex items-center gap-2 bg-green-800 hover:bg-green-900 active:bg-green-950 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  📄 Esporta PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1250px]">
                <thead>
                  <tr className="bg-green-800 text-white">
                    <th className="px-2 py-2 text-center rounded-tl-lg">ID</th>
                    <th className="px-2 py-2 text-center">Coltura</th>
                    <th className="px-2 py-2 text-center">Varietà</th>
                    <th className="px-2 py-2 text-center">Rilev.</th>
                    <th className="px-2 py-2 text-center">Semina / trapianto</th>
                    <th className="px-2 py-2 text-center">Cliente</th>
                    <th className="px-2 py-2 text-center">Appezz.</th>
                    <th className="px-2 py-2 text-center">DAS / gg</th>
                    <th className="px-2 py-2 text-center">BBCH</th>
                    <th className="px-2 py-2 text-center">Fase</th>
                    <th className="px-2 py-2 text-center">Età Piant.</th>
                    <th className="px-2 py-2 text-center">Densità</th>
                    <th className="px-2 py-2 text-center">Media</th>
                    <th className="px-2 py-2 text-center">CV NDVI</th>
                    <th className="px-2 py-2 text-center">Ottimale</th>
                    <th className="px-2 py-2 text-center">Diff.</th>
                    <th className="px-2 py-2 text-center">N già distr.</th>
                    <th className="px-2 py-2 text-center">Dose (kg/ha)</th>
                    <th className="px-2 py-2 text-center">GPS</th>
                    <th className="px-2 py-2 text-center rounded-tr-lg">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOss ? (
                    <tr><td colSpan={20} className="py-8 text-center text-stone-400">Caricamento…</td></tr>
                  ) : osservazioni.map((obs, i) => {
                    const stats = statisticheNdvi([obs.n1, obs.n2, obs.n3, obs.n4, obs.n5]);
                    const isObsGrano = obs.coltura === "grano duro";
                    return (
                    <tr key={obs.id} className={i % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                      <td className="px-2 py-2 text-center font-mono font-semibold text-green-800">{obs.id}</td>
                      <td className="px-2 py-2 text-center capitalize">{obs.coltura ?? "tabacco"}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">{obs.varieta}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">{obs.data}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap text-stone-400">
                        {(isObsGrano ? obs.dataSemina : obs.dataTrapianto) || "—"}
                      </td>
                      <td className="px-2 py-2 text-center">{obs.cliente}</td>
                      <td className="px-2 py-2 text-center">{obs.appezzamento}</td>
                      <td className="px-2 py-2 text-center">{obs.giorni}</td>
                      <td className="px-2 py-2 text-center text-xs font-mono whitespace-nowrap">{isObsGrano ? obs.bbch || "—" : "—"}</td>
                      <td className="px-2 py-2 text-center text-xs whitespace-nowrap">{obs.faseFenologica || "—"}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        {isObsGrano ? "—" : <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          (obs.etaPiantina ?? "standard") === "extra"
                            ? "bg-purple-100 text-purple-700"
                            : (obs.etaPiantina ?? "standard") === "avanzata"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-stone-100 text-stone-600"
                        }`}>{ETA_PIANTINA_LABELS[obs.etaPiantina ?? "standard"]?.short ?? "Std"}</span>}
                      </td>
                      <td className="px-2 py-2 text-center text-xs font-mono text-stone-600">
                        {obs.densitaValore != null
                          ? <>
                              {Number(obs.densitaValore).toLocaleString("it-IT")} {obs.densitaUnita ?? ""}
                              {isObsGrano && obs.pianteHaEquivalenti != null && obs.densitaUnita !== "semi/ha"
                                ? <><br /><span className="text-stone-400">≈ {Math.round(obs.pianteHaEquivalenti).toLocaleString("it-IT")} semi/ha</span></>
                                : null}
                            </>
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-center font-semibold bg-green-50 text-green-800">
                        {obs.media.toFixed(3)}
                      </td>
                      <td className={`px-2 py-2 text-center font-mono text-xs ${
                        isObsGrano || stats.coefficienteVariazione <= 8
                          ? "text-green-700"
                          : stats.coefficienteVariazione <= 15
                          ? "text-amber-700"
                          : "text-red-700"
                      }`}>
                        {`${stats.coefficienteVariazione.toFixed(1)}%`}
                      </td>
                      <td className="px-2 py-2 text-center text-stone-500">{obs.ottimale.toFixed(3)}</td>
                      <td className="px-2 py-2 text-center">{obs.discostamento.toFixed(3)}</td>
                      <td className="px-2 py-2 text-center font-mono text-xs">
                        {isObsGrano ? `${obs.azotoGiaDistribuito ?? 0} N` : "—"}
                      </td>
                      <td className={`px-2 py-2 text-center font-bold ${
                        obs.dose === 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                      }`}>
                        {(isObsGrano ? obs.quotaAzoto ?? obs.dose : obs.dose).toFixed(1)}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-stone-400 font-mono whitespace-nowrap">
                        {obs.lat != null && obs.lng != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${obs.lat.toFixed(6)},${obs.lng.toFixed(6)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 hover:underline"
                            title="Apri in Google Maps"
                          >
                            {obs.lat.toFixed(5)}<br />{obs.lng.toFixed(5)}
                          </a>
                        ) : <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => eliminaOsservazione(obs.id)}
                          className="text-red-400 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          title="Elimina osservazione"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-green-700 pb-4">
          {isGranoDuro
            ? "Grano duro: quota del punto = fase BBCH confermata, limitata da fabbisogno residuo e intervallo disciplinare; l'NDVI la modula solo entro ±15%."
            : "Formula: Dose = (NDVI_ottimale − NDVI_media) × 500 × (resa / 4.5) · Limite max = azoto totale / 2"}
        </p>

        </>}

      </div>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-green-100 last:border-0">
      <span className="text-stone-600">{label}:</span>
      <span className={`font-semibold ${highlight ? "text-green-800" : "text-stone-800"}`}>{value}</span>
    </div>
  );
}
