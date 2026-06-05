import { useState, useCallback, useMemo } from "react";
import taurusLogo from "@assets/Tauruss_1780665840150.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type TipoIntervento =
  | "copertura_prima"
  | "copertura_seconda"
  | "fertirrigazione";

const TIPO_LABELS: Record<TipoIntervento, string> = {
  copertura_prima:   "Concimazione copertura — 1ª",
  copertura_seconda: "Concimazione copertura — 2ª",
  fertirrigazione:   "Fertirrigazione (seconda copertura)",
};

type Observation = {
  id: string;
  data: string;
  dataTrapianto: string;
  tipoIntervento: TipoIntervento;
  giorni: number;
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
};

function calcola(
  resa: number,
  azotoTot: number,
  giorni: number,
  n1: number,
  n2: number,
  n3: number,
  n4: number,
  n5: number
) {
  const media = (n1 + n2 + n3 + n4 + n5) / 5;
  const ottimale = 0.5 + (giorni - 30) * 0.01;
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
  label, value, onChange, step = 1, min, max, hint, readonly,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; hint?: string; readonly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      {readonly ? (
        <input type="number" value={value} readOnly className={disabledCls} />
      ) : (
        <input type="number" value={value} step={step} min={min} max={max}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={inputCls} />
      )}
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);

export default function App() {
  const [obsId, setObsId]               = useState("1");
  const [data, setData]                 = useState(today);
  const [dataTrapianto, setDataTrapianto] = useState("");
  const [tipoIntervento, setTipoIntervento] = useState<TipoIntervento>("copertura_prima");
  const [cliente, setCliente]           = useState("");
  const [appezzamento, setAppezzamento] = useState("");
  const [varieta, setVarieta]           = useState("Burley");
  const [resa, setResa]                 = useState(4.5);
  const [azotoTot, setAzotoTot]         = useState(200);
  const [giorniManuale, setGiorniManuale] = useState(31);
  const [n1, setN1] = useState(0.42);
  const [n2, setN2] = useState(0.38);
  const [n3, setN3] = useState(0.41);
  const [n4, setN4] = useState(0.39);
  const [n5, setN5] = useState(0.4);
  const [osservazioni, setOsservazioni] = useState<Observation[]>([]);
  const [errors, setErrors]             = useState<Record<string, string>>({});

  // Giorni auto-calcolati se c'è la data trapianto, altrimenti manuali
  const giorniAuto = useMemo(() => diffDays(dataTrapianto, data), [dataTrapianto, data]);
  const giorni = giorniAuto ?? giorniManuale;
  const autoCalcolato = giorniAuto !== null;

  const risultati = calcola(resa, azotoTot, giorni, n1, n2, n3, n4, n5);

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
    setOsservazioni((prev) => [
      ...prev,
      {
        id: trimmedId,
        data,
        dataTrapianto,
        tipoIntervento,
        giorni,
        cliente: cliente.trim(),
        appezzamento: appezzamento.trim(),
        resa,
        varieta,
        n1, n2, n3, n4, n5,
        ...risultati,
      },
    ]);
    const num = parseInt(trimmedId);
    setObsId(isNaN(num) ? "" : String(num + 1));
  }, [obsId, data, dataTrapianto, tipoIntervento, giorni, cliente, appezzamento, osservazioni, resa, varieta, n1, n2, n3, n4, n5, risultati]);

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
          "ID", "Rilev.", "Trapianto", "Cliente", "Appezz.", "Tipo", "Gg",
          "M1", "M2", "M3", "M4", "M5",
          "Media", "Ottimale", "Diff.", "Dose\n(kg/ha)",
        ]],
        body: osservazioni.map((o) => [
          o.id,
          o.data,
          o.dataTrapianto || "—",
          o.cliente,
          o.appezzamento,
          o.tipoIntervento === "copertura_prima"   ? "Cop. 1ª"
            : o.tipoIntervento === "copertura_seconda" ? "Cop. 2ª"
            : "Fertirrrig.",
          o.giorni,
          o.n1.toFixed(2), o.n2.toFixed(2), o.n3.toFixed(2), o.n4.toFixed(2), o.n5.toFixed(2),
          o.media.toFixed(3),
          o.ottimale.toFixed(3),
          o.discostamento.toFixed(3),
          o.dose.toFixed(1),
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

  const ndviOttimaleNote = `Riferimento per ${giorni} gg: 0.50 + (${giorni} − 30) × 0.01 = ${risultati.ottimale.toFixed(3)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center flex flex-col items-center gap-2">
          <img src={taurusLogo} alt="Taurus Agriculture Solution" className="h-28 w-auto drop-shadow-md" />
          <h1 className="text-3xl font-bold text-green-900">Calcolatore NDVI Tabacco</h1>
          <p className="text-green-700 mt-0.5 text-sm">Strumento di supporto alla fertilizzazione azotata</p>
        </div>

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

            {/* Tipo intervento — occupa tutta la larghezza */}
            <div className="col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-stone-700">Tipo Monitoraggio</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(TIPO_LABELS) as TipoIntervento[]).map((key) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors text-sm font-medium
                      ${tipoIntervento === key
                        ? "bg-green-800 text-white border-green-800"
                        : "bg-white text-stone-700 border-stone-300 hover:border-green-700"}`}
                  >
                    <input
                      type="radio"
                      name="tipoIntervento"
                      value={key}
                      checked={tipoIntervento === key}
                      onChange={() => setTipoIntervento(key)}
                      className="accent-white"
                    />
                    {TIPO_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* — Parametri Colturali — */}
          <h2 className="text-lg font-bold text-green-900 border-b border-stone-100 pb-2">Parametri Colturali</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">Coltura</label>
              <input type="text" value="Tabacco" disabled className={disabledCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">Varietà</label>
              <select value={varieta} onChange={(e) => setVarieta(e.target.value)} className={inputCls}>
                <option value="Burley">Burley</option>
                <option value="Virginia">Virginia</option>
              </select>
            </div>
            <NumberInput label="Resa Desiderata (t/ha)" value={resa} onChange={setResa} step={0.1} />
            <NumberInput label="Kg Azoto Totale" value={azotoTot} onChange={setAzotoTot} />

            {/* Data Trapianto — occupa tutta la larghezza */}
            <div className="col-span-2">
              <DateInput
                label="Data Trapianto"
                value={dataTrapianto}
                onChange={setDataTrapianto}
                hint={dataTrapianto ? undefined : "Opzionale — se inserita calcola i giorni in automatico"}
              />
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
            <div className="text-xs text-green-700 bg-green-100 rounded-lg px-3 py-2 font-mono">
              📐 {ndviOttimaleNote}
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
              <button
                onClick={esportaPDF}
                className="flex items-center gap-2 bg-green-800 hover:bg-green-900 active:bg-green-950 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                📄 Esporta PDF
              </button>
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
                    <th className="px-2 py-2 text-center">Tipo</th>
                    <th className="px-2 py-2 text-center">Gg</th>
                    <th className="px-2 py-2 text-center">Media</th>
                    <th className="px-2 py-2 text-center">Ottimale</th>
                    <th className="px-2 py-2 text-center">Diff.</th>
                    <th className="px-2 py-2 text-center rounded-tr-lg">Dose (kg/ha)</th>
                  </tr>
                </thead>
                <tbody>
                  {osservazioni.map((obs, i) => (
                    <tr key={obs.id} className={i % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                      <td className="px-2 py-2 text-center font-mono font-semibold text-green-800">{obs.id}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">{obs.data}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap text-stone-400">
                        {obs.dataTrapianto || "—"}
                      </td>
                      <td className="px-2 py-2 text-center">{obs.cliente}</td>
                      <td className="px-2 py-2 text-center">{obs.appezzamento}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          obs.tipoIntervento === "fertirrigazione"
                            ? "bg-blue-100 text-blue-700"
                            : obs.tipoIntervento === "copertura_seconda"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {obs.tipoIntervento === "copertura_prima"   ? "Cop. 1ª"
                           : obs.tipoIntervento === "copertura_seconda" ? "Cop. 2ª"
                           : "Fertirrrig."}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">{obs.giorni}</td>
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
