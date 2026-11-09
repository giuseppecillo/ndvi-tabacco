/** Invented records only. Literal expectations, independent of current calculators. */
export const doseExportStorageKey = "nitrocrop-catalogue-synthetic-only";
export const doseExportRecords = ["pomodoro", "Kiwi"].flatMap((coltura, cropIndex) =>
  [0, 0.1, 0.006].map((dose, index) => ({
    id: `QA-${cropIndex ? "K" : "T"}-${["ZERO", "TENTH", "LEGACY"][index]}`,
    coltura, varieta: cropIndex ? "Hayward" : "Abraracourcix",
    cliente: "Synthetic EN ES", appezzamento: `Invented ${coltura} ${index}`,
    data: "2026-11-09", dataTrapianto: "2026-10-01", giorni: 39,
    etaPiantina: "standard", resa: cropIndex ? 31.3 : 100,
    densitaValore: cropIndex ? 500 : 30000, densitaUnita: "piante/ha",
    pianteHaEquivalenti: cropIndex ? 500 : 30000,
    faseFenologica: cropIndex ? "F3 · Accrescimento dei frutti" : "Fioritura",
    faseFonte: "Fase osservata in campo", bbch: null,
    n1: 0, n2: 0, n3: 0, n4: 0, n5: 0, media: 0,
    ottimale: 0.5, discostamento: 0.5, dose, quotaAzoto: dose,
    azotoTotale: cropIndex ? 151 : 250,
    azotoGiaDistribuito: (cropIndex ? 151 : 250) - (index === 0 ? 0.06 : 0.16),
    lat: 45.123456, lng: 12.345678,
    createdAt: `2026-11-09T10:0${cropIndex * 3 + index}:00.000Z`,
  })),
);
