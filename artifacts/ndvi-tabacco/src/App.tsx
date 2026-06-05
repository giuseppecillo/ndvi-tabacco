import { useState, useCallback } from "react";
import taurusLogo from "@assets/Tauruss_1780665840150.png";

type Observation = {
  id: string;
  giorni: number;
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

const inputCls =
  "w-full px-3 py-2.5 border border-stone-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent transition bg-white";

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-stone-700">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={inputCls}
      />
    </div>
  );
}

export default function App() {
  const [obsId, setObsId] = useState("1");
  const [varieta, setVarieta] = useState("Burley");
  const [resa, setResa] = useState(4.5);
  const [azotoTot, setAzotoTot] = useState(200);
  const [giorni, setGiorni] = useState(31);
  const [n1, setN1] = useState(0.42);
  const [n2, setN2] = useState(0.38);
  const [n3, setN3] = useState(0.41);
  const [n4, setN4] = useState(0.39);
  const [n5, setN5] = useState(0.4);
  const [osservazioni, setOsservazioni] = useState<Observation[]>([]);
  const [idError, setIdError] = useState("");

  const risultati = calcola(resa, azotoTot, giorni, n1, n2, n3, n4, n5);

  const salvaOsservazione = useCallback(() => {
    const trimmedId = obsId.trim();
    if (!trimmedId) {
      setIdError("Inserisci un ID valido.");
      return;
    }
    if (osservazioni.some((o) => o.id === trimmedId)) {
      setIdError(`ID "${trimmedId}" già utilizzato.`);
      return;
    }
    setIdError("");
    setOsservazioni((prev) => [
      ...prev,
      { id: trimmedId, giorni, resa, varieta, n1, n2, n3, n4, n5, ...risultati },
    ]);
    // suggerisci il prossimo id numerico
    const num = parseInt(trimmedId);
    setObsId(isNaN(num) ? "" : String(num + 1));
  }, [obsId, osservazioni, giorni, resa, varieta, n1, n2, n3, n4, n5, risultati]);

  const doseColor =
    risultati.dose === 0
      ? "text-green-700"
      : risultati.dose > 50
      ? "text-red-700"
      : "text-amber-600";

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
          <h2 className="text-lg font-bold text-green-900 border-b border-stone-100 pb-2">Parametri Colturali</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* ID Osservazione */}
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">
                ID Osservazione
              </label>
              <input
                type="text"
                value={obsId}
                onChange={(e) => { setObsId(e.target.value); setIdError(""); }}
                placeholder="es. 1, OBS-01, parcella-A…"
                className={`${inputCls} ${idError ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {idError && <p className="text-xs text-red-600">{idError}</p>}
            </div>

            {/* Coltura (static) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">Coltura</label>
              <input
                type="text"
                value="Tabacco"
                disabled
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg bg-stone-50 text-stone-400 text-base"
              />
            </div>

            {/* Varietà */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-stone-700">Varietà</label>
              <select
                value={varieta}
                onChange={(e) => setVarieta(e.target.value)}
                className={inputCls}
              >
                <option value="Burley">Burley</option>
                <option value="Virginia">Virginia</option>
              </select>
            </div>

            <NumberInput label="Resa Desiderata (t/ha)" value={resa} onChange={setResa} step={0.1} />
            <NumberInput label="Kg Azoto Totale" value={azotoTot} onChange={setAzotoTot} />
            <div className="col-span-2 sm:col-span-1">
              <NumberInput label="Giorni dal Trapianto" value={giorni} onChange={setGiorni} min={20} max={70} />
            </div>
          </div>

          {/* NDVI Readings */}
          <div>
            <h2 className="text-lg font-bold text-green-900 border-b border-stone-100 pb-2 mb-4">Letture NDVI</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberInput label="Misura 1" value={n1} onChange={setN1} step={0.01} />
              <NumberInput label="Misura 2" value={n2} onChange={setN2} step={0.01} />
              <NumberInput label="Misura 3" value={n3} onChange={setN3} step={0.01} />
              <NumberInput label="Misura 4" value={n4} onChange={setN4} step={0.01} />
              <NumberInput label="Misura 5" value={n5} onChange={setN5} step={0.01} />
            </div>
          </div>

          {/* Results */}
          <div className="bg-green-50 border-l-4 border-green-700 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-green-900 mb-1">Risultati</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <ResultRow label="Media NDVI" value={risultati.media.toFixed(3)} />
              <ResultRow label="NDVI Ottimale" value={risultati.ottimale.toFixed(3)} />
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

          <button
            onClick={salvaOsservazione}
            className="w-full bg-green-800 hover:bg-green-900 active:bg-green-950 text-white font-bold py-3.5 rounded-xl text-base transition-colors"
          >
            💾 Salva Osservazione
          </button>
        </div>

        {/* Observations Table */}
        {osservazioni.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-green-900">Registro Osservazioni</h2>
              <span className="text-sm text-stone-400">{osservazioni.length} record</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-green-800 text-white">
                    <th className="px-3 py-2 text-center rounded-tl-lg">ID</th>
                    <th className="px-3 py-2 text-center">Gg</th>
                    <th className="px-3 py-2 text-center">Resa</th>
                    <th className="px-3 py-2 text-center">M1</th>
                    <th className="px-3 py-2 text-center">M2</th>
                    <th className="px-3 py-2 text-center">M3</th>
                    <th className="px-3 py-2 text-center">M4</th>
                    <th className="px-3 py-2 text-center">M5</th>
                    <th className="px-3 py-2 text-center">Media</th>
                    <th className="px-3 py-2 text-center">Ottimale</th>
                    <th className="px-3 py-2 text-center">Diff.</th>
                    <th className="px-3 py-2 text-center rounded-tr-lg">Dose</th>
                  </tr>
                </thead>
                <tbody>
                  {osservazioni.map((obs, i) => (
                    <tr key={obs.id} className={i % 2 === 0 ? "bg-stone-50" : "bg-white"}>
                      <td className="px-3 py-2 text-center font-mono font-semibold text-green-800">{obs.id}</td>
                      <td className="px-3 py-2 text-center">{obs.giorni}</td>
                      <td className="px-3 py-2 text-center">{obs.resa}</td>
                      <td className="px-3 py-2 text-center">{obs.n1}</td>
                      <td className="px-3 py-2 text-center">{obs.n2}</td>
                      <td className="px-3 py-2 text-center">{obs.n3}</td>
                      <td className="px-3 py-2 text-center">{obs.n4}</td>
                      <td className="px-3 py-2 text-center">{obs.n5}</td>
                      <td className="px-3 py-2 text-center font-semibold bg-green-50 text-green-800">
                        {obs.media.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-center">{obs.ottimale.toFixed(3)}</td>
                      <td className="px-3 py-2 text-center">{obs.discostamento.toFixed(3)}</td>
                      <td
                        className={`px-3 py-2 text-center font-bold ${
                          obs.dose === 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                        }`}
                      >
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

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-green-100 last:border-0">
      <span className="text-stone-600">{label}:</span>
      <span className="font-semibold text-stone-800">{value}</span>
    </div>
  );
}
