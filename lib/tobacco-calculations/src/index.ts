// Pure tobacco rules. Input validation stays at the app/API boundaries.
export type EtaPiantina = "standard" | "avanzata" | "extra";

export const ETA_GIORNI_EQUIVALENTI: Readonly<Record<EtaPiantina, number>> = {
  standard: 0,
  avanzata: 7,
  extra: 14,
};

export const NDVI_CURVA = [
  { giorni: 0, ottimale: 0.28 },
  { giorni: 14, ottimale: 0.34 },
  { giorni: 28, ottimale: 0.48 },
  { giorni: 42, ottimale: 0.64 },
  // Riferimento operativo, da confrontare sempre con la fase osservata:
  // crescita fino a 55 DAT, plateau a 75–85 DAT, poi fioritura/regressione.
  { giorni: 55, ottimale: 0.70 },
  { giorni: 65, ottimale: 0.79 },
  { giorni: 75, ottimale: 0.80 },
  { giorni: 85, ottimale: 0.80 },
  { giorni: 95, ottimale: 0.75 },
  { giorni: 110, ottimale: 0.68 },
  { giorni: 130, ottimale: 0.60 },
] as const;

export function riferimentoNdviTabacco(giorni: number, etaPiantina: EtaPiantina = "standard") {
  const giorniFenologici = Math.max(0, giorni + ETA_GIORNI_EQUIVALENTI[etaPiantina]);
  const first = NDVI_CURVA[0];
  const last = NDVI_CURVA[NDVI_CURVA.length - 1];
  if (giorniFenologici <= first.giorni) return { ottimale: first.ottimale, giorniFenologici };
  for (let i = 1; i < NDVI_CURVA.length; i++) {
    const right = NDVI_CURVA[i];
    if (giorniFenologici <= right.giorni) {
      const left = NDVI_CURVA[i - 1];
      const t = (giorniFenologici - left.giorni) / (right.giorni - left.giorni);
      const smoothT = t * t * (3 - 2 * t);
      return {
        ottimale: left.ottimale + (right.ottimale - left.ottimale) * smoothT,
        giorniFenologici,
      };
    }
  }
  return { ottimale: last.ottimale, giorniFenologici };
}

export function calcolaDoseNTabacco(input: {
  media: number;
  ottimale: number;
  fabbisognoN: number;
  azotoTotale: number;
  azotoGiaDistribuito: number;
}) {
  const { media, ottimale, fabbisognoN, azotoTotale, azotoGiaDistribuito } = input;
  const discostamento = Math.max(0, ottimale - media);
  const deficitRelativo = ottimale > 0 ? Math.min(1, discostamento / ottimale) : 0;
  // Round both quotas before applying the residual cap, preserving one decimal.
  const quotaDaDeficitNdvi = Math.round(fabbisognoN * deficitRelativo * 10) / 10;
  const residuoPiano = Math.max(0, Math.round((azotoTotale - azotoGiaDistribuito) * 10) / 10);
  return {
    discostamento,
    deficitRelativo,
    quotaDaDeficitNdvi,
    residuoPiano,
    dose: Math.min(residuoPiano, quotaDaDeficitNdvi),
  };
}
