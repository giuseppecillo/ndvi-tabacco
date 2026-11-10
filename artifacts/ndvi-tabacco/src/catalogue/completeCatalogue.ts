import { FASI_POMODORO, POMODORO_DB } from "@workspace/tomato-calculations";
import { GRANO_DURO_DB, fasiGranoPerVarieta } from "@workspace/grain-calculations";
import type { VarietaDati } from "../calculations";
import type {CropProfile} from "@workspace/crop-calculations";

export type CatalogueSnapshot = { columns: readonly string[]; rows: readonly (readonly string[])[] };
const extraFields = [
  ["categoria", "Categoria"],
  ["resaDefault", "Resa di riferimento (unità originale)"],
  ["resaMin", "Resa minima (t/ha)"], ["resaMax", "Resa massima (t/ha)"],
  ["azotoDefault", "Azoto di riferimento (kg N/ha)"],
  ["azotoMin", "Azoto minimo (kg N/ha)"], ["azotoMax", "Azoto massimo (kg N/ha)"],
  ["kgNPerTon", "Azoto per tonnellata (kg N/t)"],
  ["densitaPianteDefault", "Densità di riferimento (piante/ha)"],
  ["kgSemiDefault", "Seme di riferimento (kg/ha)"],
  ["densitaSemiMqMin", "Densità minima (semi/m²)"],
  ["densitaSemiMqMax", "Densità massima (semi/m²)"],
  ["densitaSemiMqDefault", "Densità di riferimento (semi/m²)"],
  ["doseSemeKgHaMin", "Seme minimo (kg/ha)"], ["doseSemeKgHaMax", "Seme massimo (kg/ha)"],
  ["doseSemeKgHaDefault", "Seme di riferimento (kg/ha)"],
  ["pesoMilleSemiG", "Peso mille semi (g)"], ["proteineObiettivo", "Proteine obiettivo (%)"],
] as const;

/** Display union only: never changes operational models, IDs, observations or SQL. */
export function completeCatalogue(snapshot: CatalogueSnapshot, tobacco: readonly VarietaDati[], approved: readonly CropProfile[]=[]): { columns: string[]; rows: string[][] } {
  const columns = [...snapshot.columns];
  const addColumn = (name: string) => { if (!columns.includes(name)) columns.push(name); };
  const grainPhases = Math.max(...Object.keys(GRANO_DURO_DB).map(name => fasiGranoPerVarieta(name).length));
  for (let phase = 1; phase <= grainPhases; phase++) {
    for (const name of [`Fase F${phase}`, `N F${phase} (kg/ha)`, `BBCH F${phase}`, `NDVI F${phase}`, `Quota N F${phase} (0–1)`]) addColumn(name);
  }
  extraFields.forEach(([, name]) => addColumn(name));
  addColumn("Unità resa di riferimento");
  for (let phase = 1; phase <= FASI_POMODORO.length; phase++) {
    addColumn(`NDVI F${phase} min`);
    addColumn(`NDVI F${phase} max`);
  }
  const row = (values: Record<string, string | number | undefined>) =>
    columns.map(name => values[name] === undefined ? "" : String(values[name]));
  const extra = (profile: object): Record<string, string | number | undefined> => {
    const values = profile as Record<string, string | number | undefined>;
    return Object.fromEntries(extraFields.filter(([key]) => values[key] !== undefined).map(([key, name]) => [name, values[key]]));
  };
  const rows = snapshot.rows.map(source => row(Object.fromEntries(snapshot.columns.map((name, i) => [name, source[i] ?? ""]))));
  for (const p of Object.values(POMODORO_DB)) {
    const values: Record<string, string | number> = {
      Coltura: "Pomodoro", "Varietà": p.nome, Destinazione: p.destinazione, Impiego: p.impiego,
      "Precocità": p.precocita, "Piante/ha": p.pianteHa, "Resa media (t/ha)": p.resa, "Azoto Totale (kg/ha)": p.azotoTotale,
    };
    p.fasi.forEach(([n, min, max], i) => {
      Object.assign(values, {
        [`Fase F${i + 1}`]: FASI_POMODORO[i], [`N F${i + 1} (kg/ha)`]: n,
        [`NDVI F${i + 1}`]: (min + max) / 2, [`NDVI F${i + 1} min`]: min, [`NDVI F${i + 1} max`]: max,
      });
    });
    rows.push(row(values));
  }
  for (const p of Object.values(GRANO_DURO_DB)) {
    const values: Record<string, string | number | undefined> = {
      ...extra(p), Coltura: "Grano duro", "Varietà": p.label, "Unità resa di riferimento": "q/ha",
      "Resa media (t/ha)": p.resaDefault === undefined ? undefined : p.resaDefault / 10,
    };
    fasiGranoPerVarieta(p.label).forEach((phase, i) => {
      Object.assign(values, {
        [`Fase F${i + 1}`]: phase.label, [`BBCH F${i + 1}`]: phase.bbch,
        [`N F${i + 1} (kg/ha)`]: phase.azotoMin === phase.azotoMax ? phase.azotoMin : `${phase.azotoMin}–${phase.azotoMax}`,
        [`Quota N F${i + 1} (0–1)`]: phase.quotaSulTotale,
      });
    });
    rows.push(row(values));
  }
  for (const p of tobacco) rows.push(row({
    ...extra(p), Coltura: "Tabacco", "Varietà": p.label, "Piante/ha": p.densitaPianteDefault,
    "Resa media (t/ha)": p.resaDefault, "Azoto Totale (kg/ha)": p.azotoDefault, "Unità resa di riferimento": "t/ha",
  }));
  for(const p of approved) {
    const values:Record<string,string|number>={Coltura:p.crop==="grano duro"?"Grano duro":p.crop.charAt(0).toUpperCase()+p.crop.slice(1),
      "Varietà":p.name,Destinazione:p.destination,Impiego:p.use,"Precocità":p.earliness,
      "Piante/ha":p.plants,"Resa media (t/ha)":p.yield,"Azoto Totale (kg/ha)":p.nitrogen};
    p.phases.forEach((phase,i)=>{
      Object.assign(values,{[`Fase F${i+1}`]:phase.label,[`BBCH F${i+1}`]:phase.bbch,
        [`NDVI F${i+1}`]:phase.riferimento,[`N F${i+1} (kg/ha)`]:phase.azoto});
    });
    rows.push(row(values));
  }
  return { columns, rows };
}
