import { createRoot } from "react-dom/client";
import { calcolaPomodoro, PRIMO_POMODORO } from "@workspace/tomato-calculations";
import { CROP_PROFILES, calculateCrop } from "@workspace/crop-calculations";
import { PomodoroResults } from "../src/components/PomodoroParameters";
import { CatalogueCropResults } from "../src/components/CatalogueCropParameters";
import { formatRecordedDose } from "../src/utils/observationDose";
import "../src/index.css";

if (!import.meta.env.DEV) throw new Error("Synthetic precision fixture is development-only.");
window.fetch = async () => { throw new Error("Network disabled: synthetic precision fixture."); };
const tomato = calcolaPomodoro({ varieta: PRIMO_POMODORO, fase: "Sviluppo", confermata: true,
  resa: 100, azotoGiaDistribuito: 249.94, letture: [0, 0, 0, 0, 0] });
const profile = CROP_PROFILES[0];
const crop = calculateCrop({ crop: profile.crop, variety: profile.name, phase: "F1", confirmed: true,
  yield: profile.yield, applied: profile.nitrogen - .06, readings: [0, 0, 0, 0, 0] });

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-5xl space-y-4 p-5">
    <h1 className="text-xl font-bold text-green-950">Precisione delle dosi — solo dati sintetici</h1>
    <p>Residuo 0,06 kg N/ha: la nuova dose è 0,0, mai 0,1. Nessuna connessione ai dati reali.</p>
    <div className="grid gap-4 md:grid-cols-2">
      <PomodoroResults piano={tomato} />
      <CatalogueCropResults piano={crop} />
    </div>
    <section className="rounded-xl border bg-white p-4">
      <h2 className="font-bold">Valori storici conservati, senza ricalcolo</h2>
      <p>Dose salvata 0,06 → dose mostrata {formatRecordedDose("pomodoro", .06)} kg N/ha</p>
      <p>Dose salvata 0,006 → dose mostrata {formatRecordedDose(profile.crop, .006)} kg N/ha</p>
    </section>
  </main>,
);
