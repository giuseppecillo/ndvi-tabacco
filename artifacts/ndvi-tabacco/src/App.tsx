import { useState, useCallback, useMemo, useEffect } from "react";
const taurusLogo = `${import.meta.env.BASE_URL}taurus-logo.png`;
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ElaborazioniMappe } from "./ElaborazioniMappe";
import { exportObservationsCsv } from "./utils/geoUtils";

export type EtaPiantina = "standard" | "avanzata" | "extra";

export const ETA_PIANTINA_LABELS: Record<EtaPiantina, { label: string; short: string; giorni: string }> = {
  standard: { label: "Standard",       short: "Std",  giorni: "25–35 gg vivaio" },
  avanzata: { label: "Avanzata",       short: "Av.",  giorni: "35–45 gg vivaio" },
  extra:    { label: "Extra-avanzata", short: "Ext.", giorni: "> 45 gg vivaio"  },
};

const ETA_SHIFT: Record<EtaPiantina, number> = {
  standard: 0.00,
  avanzata: 0.05,
  extra:    0.08,
};

type VarietaDati = {
  label: string;
  categoria: string;
  resaDefault: number;
  resaMin: number;
  resaMax: number;
  azotoDefault: number;
  azotoMin: number;
  azotoMax: number;
  // Asportazione azoto per tonnellata di produzione (kg N/t).
  // Fonte: disciplinari regionali + PDF Taurus. Usato per calcolare
  // il fabbisogno reale quando la resa supera il limite di disciplinare.
  kgNPerTon: number;
};

export const VARIETA_DB: Record<string, VarietaDati> = {
  "Burley (Non Cimato)": {
    label: "Burley (Non Cimato)",
    categoria: "Light Air-Cured",
    resaDefault: 4.5, resaMin: 4.0, resaMax: 5.6,
    azotoDefault: 175, azotoMin: 150, azotoMax: 200,
    kgNPerTon: 36,   // 200 kg / 5.6 t ≈ 35.7 → arrotondato a 36
  },
  "Burley (Cimato)": {
    label: "Burley (Cimato)",
    categoria: "Light Air-Cured",
    resaDefault: 3.0, resaMin: 2.5, resaMax: 4.0,
    azotoDefault: 115, azotoMin: 80, azotoMax: 150,
    kgNPerTon: 38,   // 150 kg / 4.0 t = 37.5 → arrotondato a 38
  },
  "Virginia Bright": {
    label: "Virginia Bright",
    categoria: "Flue-Cured",
    resaDefault: 3.5, resaMin: 2.8, resaMax: 4.2,
    azotoDefault: 130, azotoMin: 100, azotoMax: 160,
    kgNPerTon: 38,   // 160 kg / 4.2 t ≈ 38.1
  },
  "Kentucky": {
    label: "Kentucky",
    categoria: "Fire-Cured",
    resaDefault: 2.2, resaMin: 1.8, resaMax: 3.3,
    azotoDefault: 135, azotoMin: 100, azotoMax: 160,
    kgNPerTon: 48,   // 160 kg / 3.3 t ≈ 48.5 → arrotondato a 48
  },
  "Dark Air-Cured (DAC)": {
    label: "Dark Air-Cured (DAC)",
    categoria: "Dark Air-Cured",
    resaDefault: 3.0, resaMin: 2.5, resaMax: 3.7,
    azotoDefault: 175, azotoMin: 150, azotoMax: 200,
    kgNPerTon: 54,   // 200 kg / 3.7 t ≈ 54.1
  },
  "Nostrano del Brenta": {
    label: "Nostrano del Brenta",
    categoria: "Light Air-Cured",
    resaDefault: 2.4, resaMin: 2.0, resaMax: 2.8,
    azotoDefault: 110, azotoMin: 100, azotoMax: 120,
    kgNPerTon: 43,   // 120 kg / 2.8 t ≈ 42.9 → arrotondato a 43
  },
  "Beneventano": {
    label: "Beneventano",
    categoria: "Dark Air-Cured",
    resaDefault: 1.5, resaMin: 1.0, resaMax: 2.0,
    azotoDefault: 90, azotoMin: 80, azotoMax: 100,
    kgNPerTon: 50,   // 100 kg / 2.0 t = 50
  },
  "Orientali (Samsun/Xanti Yaka)": {
    label: "Orientali (Samsun/Xanti Yaka)",
    categoria: "Sun-Cured",
    resaDefault: 1.5, resaMin: 1.0, resaMax: 2.0,
    azotoDefault: 40, azotoMin: 0, azotoMax: 50,
    kgNPerTon: 55,   // esplicitamente 5.5 kg N/quintal dal documento Taurus
  },
  "Tabacco Sigari (Wrapper)": {
    label: "Tabacco Sigari (Wrapper)",
    categoria: "Shade-Grown",
    resaDefault: 2.0, resaMin: 1.5, resaMax: 2.5,
    azotoDefault: 165, azotoMin: 140, azotoMax: 190,
    kgNPerTon: 76,   // 190 kg / 2.5 t = 76
  },
};

export type Observation = {
  id: string;
  data: string;
  dataTrapianto: string;
  giorni: number;
  etaPiantina: EtaPiantina;
  cliente: string;
  appezzamento: string;
  resa: number;
  varieta: string;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  n5: number;
  media: number;
  ottimale: number;
  discostamento: number;
  dose: number;
  lat: number | null;
  lng: number | null;
};

// NDVI di riferimento per tabacco (Nicotiana tabacum) per fascia di giorni dal trapianto.
// Valori basati su curve di crescita del tabacco da letteratura agronomica:
// rapida ascesa nella fase vegetativa, picco a piena copertura canopy (51–65 gg),
// leggero calo nella fase di maturazione (> 65 gg).
// Valori base = piantina standard (25–35 gg vivaio). Per piantine più sviluppate
// viene applicato uno shift positivo (ETA_SHIFT) con cap a 0.85.
const NDVI_FASCE: Array<{ maxGiorni: number; ottimale: number; label: string }> = [
  { maxGiorni: 20,  ottimale: 0.30, label: "≤ 20 gg"  },
  { maxGiorni: 35,  ottimale: 0.40, label: "21–35 gg"  },
  { maxGiorni: 50,  ottimale: 0.62, label: "36–50 gg"  },
  { maxGiorni: 65,  ottimale: 0.74, label: "51–65 gg"  },
  { maxGiorni: 999, ottimale: 0.70, label: "> 65 gg"   },
];

function ndviOttimale(
  giorni: number,
  etaPiantina: EtaPiantina = "standard"
): { ottimale: number; label: string } {
  const fascia = NDVI_FASCE.find((f) => giorni <= f.maxGiorni) ?? NDVI_FASCE[NDVI_FASCE.length - 1];
  const ottimale = Math.min(0.85, fascia.ottimale + ETA_SHIFT[etaPiantina]);
  return { ottimale, label: fascia.label };
}

function calcola(
  resa: number,
  azotoTot: number,
  giorni: number,
  n1: number,
  n2: number,
  n3: number,
  n4: number,
  n5: number,
  etaPiantina: EtaPiantina = "standard"
) {
  const media = (n1 + n2 + n3 + n4 + n5) / 5;
  const { ottimale } = ndviOttimale(giorni, etaPiantina);
  const discostamento = Math.max(0, ottimale - media);
  let dose = discostamento * 500 * (resa / 4.5);
  const limiteMax = azotoTot / 2;
  if (dose > limiteMax) dose = limiteMax;
  if (media >= ottimale) dose = 0;
  return { media, ottimale, discostamento, dose };
}

function diffDays(from: string, to: string): number | null {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b)) return null;
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
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} ${error ? "border-red-400 focus:ring-red-400" : ""}`} />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function DateInput({
  label, value, onChange, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
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
        <input type="number" value={value} readOnly className={disabledCls} />
      ) : (
        <input type="number" value={value} step={step} min={min} max={max}
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
  const [data, setData]                 = useState(today);
  const [dataTrapianto, setDataTrapianto] = useState("");
  const [cliente, setCliente]           = useState("");
  const [appezzamento, setAppezzamento] = useState("");
  const [varieta, setVarieta]           = useState("Burley (Non Cimato)");
  const [resa, setResa]                 = useState(VARIETA_DB["Burley (Non Cimato)"].resaDefault);
  const [azotoTot, setAzotoTot]         = useState(VARIETA_DB["Burley (Non Cimato)"].azotoDefault);
  const [giorniManuale, setGiorniManuale] = useState(31);
  const [n1, setN1] = useState(0.42);
  const [n2, setN2] = useState(0.38);
  const [n3, setN3] = useState(0.41);
  const [n4, setN4] = useState(0.39);
  const [n5, setN5] = useState(0.4);
  const [etaPiantina, setEtaPiantina] = useState<EtaPiantina>("standard");
  const [osservazioni, setOsservazioni] = useState<Observation[]>([]);
  const [loadingOss, setLoadingOss] = useState(true);

  useEffect(() => {
    fetch("/api/osservazioni")
      .then((r) => r.json())
      .then((data: Observation[]) => setOsservazioni(data))
      .catch(() => {})
      .finally(() => setLoadingOss(false));
  }, []);

  // Auto-fill resa e azoto quando cambia la varietà
  useEffect(() => {
    const dati = VARIETA_DB[varieta];
    if (dati) {
      setResa(dati.resaDefault);
      setAzotoTot(dati.azotoDefault);
    }
  }, [varieta]);

  // Azoto calcolato da asportazioni quando resa supera il limite di disciplinare.
  // Formula: kg N/ha = resa (t/ha) × coefficiente asportazione (kg N/t)
  const azotoAsportazioni = useMemo(() => {
    const dati = VARIETA_DB[varieta];
    if (!dati || resa <= dati.resaMax) return null;
    return Math.round(resa * dati.kgNPerTon);
  }, [resa, varieta]);

  // Auto-aggiorna il campo azoto quando la resa supera il massimo di disciplinare
  useEffect(() => {
    if (azotoAsportazioni !== null) {
      setAzotoTot(azotoAsportazioni);
    }
  }, [azotoAsportazioni]);

  const [errors, setErrors]             = useState<Record<string, string>>({});

  // Giorni auto-calcolati se c'è la data trapianto, altrimenti manuali
  const giorniAuto = useMemo(() => diffDays(dataTrapianto, data), [dataTrapianto, data]);
  const giorni = giorniAuto ?? giorniManuale;
  const autoCalcolato = giorniAuto !== null;

  const risultati = calcola(resa, azotoTot, giorni, n1, n2, n3, n4, n5, etaPiantina);

  const salvaOsservazione = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const trimmedId = obsId.trim();
    if (!trimmedId) newErrors.id = "Inserisci un ID valido.";
    else if (osservazioni.some((o) => o.id === trimmedId))
      newErrors.id = `ID "${trimmedId}" già utilizzato.`;
    if (!cliente.trim()) newErrors.cliente = "Campo obbligatorio.";
    if (!appezzamento.trim()) newErrors.appezzamento = "Campo obbligatorio.";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setErrors({});
    const trimmedIdFinal = trimmedId;
    const num = parseInt(trimmedIdFinal);

    const doSave = (lat: number | null, lng: number | null) => {
      const nuova: Observation = {
        id: trimmedIdFinal,
        data,
        dataTrapianto,
        giorni,
        etaPiantina,
        cliente: cliente.trim(),
        appezzamento: appezzamento.trim(),
        resa,
        varieta,
        n1, n2, n3, n4, n5,
        ...risultati,
        lat,
        lng,
      };
      fetch("/api/osservazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuova),
      }).then(() => setOsservazioni((prev) => [nuova, ...prev]));
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => doSave(pos.coords.latitude, pos.coords.longitude),
        ()    => doSave(null, null),
        { timeout: 8000, maximumAge: 0, enableHighAccuracy: true }
      );
    } else {
      doSave(null, null);
    }

    setObsId(isNaN(num) ? "" : String(num + 1));
  }, [obsId, data, dataTrapianto, giorni, etaPiantina, cliente, appezzamento, osservazioni, resa, varieta, n1, n2, n3, n4, n5, risultati]);

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

  const { label: ndviFasciaLabel } = ndviOttimale(giorni, etaPiantina);
  const etaShiftLabel = ETA_SHIFT[etaPiantina] > 0
    ? ` (+${(ETA_SHIFT[etaPiantina] * 100).toFixed(0)} pt piantina ${ETA_PIANTINA_LABELS[etaPiantina].label.toLowerCase()})`
    : "";
  const ndviOttimaleNote = `Fascia ${ndviFasciaLabel} → NDVI ottimale: ${risultati.ottimale.toFixed(3)}${etaShiftLabel}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <img src={taurusLogo} alt="Taurus Agriculture Solution" className="h-28 w-auto drop-shadow-md" />
          <h1 className="text-3xl font-bold text-green-900">Calcolatore NDVI Tabacco</h1>
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
              {tab === "calcolatore" ? "🌿 Calcolatore NDVI" : "🗺 Elaborazioni e Mappe"}
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
              <input type="text" value="Tabacco" disabled className={disabledCls} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">Varietà</label>
              <select value={varieta} onChange={(e) => setVarieta(e.target.value)} className={inputCls}>
                {Object.values(VARIETA_DB).map((v) => (
                  <option key={v.label} value={v.label}>
                    {v.label} — {v.categoria} · resa {v.resaMin}–{v.resaMax} t/ha
                  </option>
                ))}
              </select>
              {VARIETA_DB[varieta] && (
                <p className="text-xs text-stone-400">
                  {VARIETA_DB[varieta].categoria} · azoto consigliato {VARIETA_DB[varieta].azotoMin}–{VARIETA_DB[varieta].azotoMax} kg/ha · resa max {VARIETA_DB[varieta].resaMax} t/ha
                </p>
              )}
            </div>
            <NumberInput
              label="Resa Desiderata (t/ha)"
              value={resa}
              onChange={setResa}
              step={0.1}
              min={0.1}
              warning={
                VARIETA_DB[varieta] && resa > VARIETA_DB[varieta].resaMax
                  ? `Supera il limite massimo di ${VARIETA_DB[varieta].resaMax} t/ha per questa varietà`
                  : undefined
              }
              hint={VARIETA_DB[varieta] ? `Range consigliato: ${VARIETA_DB[varieta].resaMin}–${VARIETA_DB[varieta].resaMax} t/ha` : undefined}
            />
            <NumberInput
              label="Kg Azoto Totale"
              value={azotoTot}
              onChange={setAzotoTot}
              min={0}
              warning={
                azotoAsportazioni !== null
                  ? `Calcolato da asportazioni: ${resa.toFixed(1)} t/ha × ${VARIETA_DB[varieta]?.kgNPerTon} kg N/t = ${azotoAsportazioni} kg/ha`
                  : undefined
              }
              hint={
                azotoAsportazioni === null && VARIETA_DB[varieta]
                  ? `Range disciplinare: ${VARIETA_DB[varieta].azotoMin}–${VARIETA_DB[varieta].azotoMax} kg/ha`
                  : undefined
              }
            />

            {/* Data Trapianto — occupa tutta la larghezza */}
            <div className="col-span-2">
              <DateInput
                label="Data Trapianto"
                value={dataTrapianto}
                onChange={setDataTrapianto}
                hint={dataTrapianto ? undefined : "Opzionale — se inserita calcola i giorni in automatico"}
              />
            </div>

            {/* Età Piantina al Trapianto */}
            <div className="col-span-2 flex flex-col gap-2">
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
                        +{(ETA_SHIFT[key] * 100).toFixed(0)} NDVI
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Giorni dal Trapianto — auto o manuale */}
            <div className="col-span-2 sm:col-span-1">
              <NumberInput
                label="Giorni dal Trapianto"
                value={giorni}
                onChange={setGiorniManuale}
                min={1}
                max={120}
                readonly={autoCalcolato}
                hint={
                  autoCalcolato
                    ? `Calcolato automaticamente da data trapianto · NDVI ref: ${risultati.ottimale.toFixed(3)}`
                    : `NDVI di riferimento: ${risultati.ottimale.toFixed(3)}`
                }
              />
            </div>
          </div>

          {/* — Letture NDVI — */}
          <h2 className="text-lg font-bold text-green-900 border-b border-stone-100 pb-2">Letture NDVI</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumberInput label="Misura 1" value={n1} onChange={setN1} step={0.01} />
            <NumberInput label="Misura 2" value={n2} onChange={setN2} step={0.01} />
            <NumberInput label="Misura 3" value={n3} onChange={setN3} step={0.01} />
            <NumberInput label="Misura 4" value={n4} onChange={setN4} step={0.01} />
            <NumberInput label="Misura 5" value={n5} onChange={setN5} step={0.01} />
          </div>

          {/* — Risultati — */}
          <div className="bg-green-50 border-l-4 border-green-700 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-green-900 mb-1">Risultati</h2>
            <div className="text-xs text-green-800 bg-green-100 rounded-lg px-3 py-2 space-y-1">
              <div className="font-semibold">📐 {ndviOttimaleNote}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-green-700 font-mono pt-0.5">
                {NDVI_FASCE.map((f) => {
                  const adj = Math.min(0.85, f.ottimale + ETA_SHIFT[etaPiantina]);
                  const isActive = f.label === ndviFasciaLabel;
                  return (
                    <span
                      key={f.label}
                      className={`whitespace-nowrap ${isActive ? "font-bold underline underline-offset-2" : "opacity-60"}`}
                    >
                      {f.label}: {adj.toFixed(2)}
                      {ETA_SHIFT[etaPiantina] > 0 && (
                        <span className="opacity-60 text-[10px]"> ({f.ottimale.toFixed(2)})</span>
                      )}
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
            <div className="border-t border-green-200 pt-3 flex items-center justify-between">
              <span className="font-semibold text-stone-700">Da Distribuire:</span>
              <span className={`text-2xl font-bold ${doseColor}`}>
                {risultati.dose.toFixed(1)}{" "}
                <span className="text-base font-semibold text-stone-500">kg/ha</span>
              </span>
            </div>
          </div>

          <button onClick={salvaOsservazione}
            className="w-full bg-green-800 hover:bg-green-900 active:bg-green-950 text-white font-bold py-3.5 rounded-xl text-base transition-colors">
            💾 Salva Osservazione
          </button>
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
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-green-800 text-white">
                    <th className="px-2 py-2 text-center rounded-tl-lg">ID</th>
                    <th className="px-2 py-2 text-center">Rilev.</th>
                    <th className="px-2 py-2 text-center">Trapianto</th>
                    <th className="px-2 py-2 text-center">Cliente</th>
                    <th className="px-2 py-2 text-center">Appezz.</th>
                    <th className="px-2 py-2 text-center">Gg</th>
                    <th className="px-2 py-2 text-center">Età Piant.</th>
                    <th className="px-2 py-2 text-center">Media</th>
                    <th className="px-2 py-2 text-center">Ottimale</th>
                    <th className="px-2 py-2 text-center">Diff.</th>
                    <th className="px-2 py-2 text-center">Dose (kg/ha)</th>
                    <th className="px-2 py-2 text-center">GPS</th>
                    <th className="px-2 py-2 text-center rounded-tr-lg">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOss ? (
                    <tr><td colSpan={13} className="py-8 text-center text-stone-400">Caricamento…</td></tr>
                  ) : osservazioni.map((obs, i) => (
                    <tr key={obs.id} className={i % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                      <td className="px-2 py-2 text-center font-mono font-semibold text-green-800">{obs.id}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">{obs.data}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap text-stone-400">
                        {obs.dataTrapianto || "—"}
                      </td>
                      <td className="px-2 py-2 text-center">{obs.cliente}</td>
                      <td className="px-2 py-2 text-center">{obs.appezzamento}</td>
                      <td className="px-2 py-2 text-center">{obs.giorni}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          (obs.etaPiantina ?? "standard") === "extra"
                            ? "bg-purple-100 text-purple-700"
                            : (obs.etaPiantina ?? "standard") === "avanzata"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-stone-100 text-stone-600"
                        }`}>
                          {ETA_PIANTINA_LABELS[obs.etaPiantina ?? "standard"]?.short ?? "Std"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-semibold bg-green-50 text-green-800">
                        {obs.media.toFixed(3)}
                      </td>
                      <td className="px-2 py-2 text-center text-stone-500">{obs.ottimale.toFixed(3)}</td>
                      <td className="px-2 py-2 text-center">{obs.discostamento.toFixed(3)}</td>
                      <td className={`px-2 py-2 text-center font-bold ${
                        obs.dose === 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                      }`}>
                        {obs.dose.toFixed(1)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-green-700 pb-4">
          Formula: Dose = (NDVI_ottimale − NDVI_media) × 500 × (resa / 4.5) · Limite max = azoto totale / 2
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
