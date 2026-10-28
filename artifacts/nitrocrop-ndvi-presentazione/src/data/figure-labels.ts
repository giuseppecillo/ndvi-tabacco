/**
 * Deterministic localisation layers for the six original app screenshots.
 * Coordinates are in a "view" space of `viewW` x `viewH` (the original image
 * uniformly scaled to viewW wide). Each region masks the original Italian
 * text line(s) and redraws the translation fitted into the same box.
 * Numbers, logos, map geography, chart marks and brand names are untouched.
 * Use "\n" for multi-line regions.
 */
export type FigureRegion = {
  x: number;
  y: number;
  w: number;
  h: number;
  en: string;
  es: string;
  background?: string;
  color?: string;
  weight?: number;
  align?: "start" | "middle";
  rotate?: number; // -90 for vertical axis labels
};

export type FigureLabels = {
  viewW: number;
  viewH: number;
  native: { w: number; h: number };
  alt: { it: string; en: string; es: string };
  regions: FigureRegion[];
};

const W = "#ffffff";
const G = "#1d5e35"; // brand green text
const GBTN = "#1d6b3a"; // green button
const TXT = "#2b2f2c";
const MUTED = "#8a8f8b";
const STAT = "#eef8f0";
const MAPTIP = "#343434";

const misura = (x: number, y: number, n: number, w = 40, h = 13, bg = W): FigureRegion => ({
  x, y, w, h, en: `Reading ${n}`, es: `Medida ${n}`, background: bg, color: TXT, weight: 600,
});

export const FIGURE_LABELS: Record<number, FigureLabels> = {
  3: {
    viewW: 724, viewH: 1024, native: { w: 1311, h: 1854 },
    alt: {
      it: "Schermata NitroCrop NDVI: anagrafica, parametri colturali, letture NDVI, risultati e mappa di dose.",
      en: "NitroCrop NDVI screen: registry, crop parameters, NDVI readings, results and dose map.",
      es: "Pantalla NitroCrop NDVI: datos generales, parámetros del cultivo, lecturas NDVI, resultados y mapa de dosis.",
    },
    regions: [
      { x: 222, y: 232, w: 280, h: 22, en: "Nitrogen fertilisation support", es: "Apoyo a la fertilización nitrogenada", background: "#f3f6f3", color: "#2e8b4a", align: "middle" },
      { x: 466, y: 299, w: 172, h: 23, en: "Analysis & Maps", es: "Análisis y mapas", background: W, color: G, weight: 700 },
      { x: 27, y: 361, w: 60, h: 16, en: "Registry", es: "Datos generales", background: W, color: G, weight: 700 },
      misura(372, 366, 1), misura(482, 366, 2), misura(593, 366, 3), misura(372, 429, 4), misura(482, 429, 5),
      { x: 27, y: 402, w: 72, h: 13, en: "Observation ID", es: "ID observación", background: W, color: TXT, weight: 600 },
      { x: 189, y: 402, w: 72, h: 13, en: "Survey date", es: "Fecha de lectura", background: W, color: TXT, weight: 600 },
      { x: 27, y: 465, w: 90, h: 13, en: "Client (farm name)", es: "Cliente (empresa)", background: W, color: TXT, weight: 600 },
      { x: 189, y: 465, w: 60, h: 13, en: "Plot", es: "Parcela", background: W, color: TXT, weight: 600 },
      { x: 31, y: 492, w: 86, h: 14, en: "e.g. Rossi Farm", es: "ej. Granja Rossi", background: W, color: MUTED },
      { x: 195, y: 492, w: 116, h: 14, en: "e.g. Plot A, North Field", es: "ej. Parcela A, Campo Norte", background: W, color: MUTED },
      { x: 27, y: 533, w: 92, h: 16, en: "Crop Parameters", es: "Parámetros del cultivo", background: W, color: G, weight: 700 },
      { x: 27, y: 573, w: 34, h: 13, en: "Crop", es: "Cultivo", background: W, color: TXT, weight: 600 },
      { x: 33, y: 599, w: 44, h: 15, en: "Tobacco", es: "Tabaco", background: "#f1f3f2", color: MUTED },
      { x: 27, y: 635, w: 34, h: 13, en: "Variety", es: "Variedad", background: W, color: TXT, weight: 600 },
      { x: 29, y: 659, w: 226, h: 16, en: "Burley (Untopped) — Light Air-Cured · yield 4–5.6 t/ha", es: "Burley (sin despuntar) — Light Air-Cured · rend. 4–5.6 t/ha", background: W, color: TXT },
      { x: 27, y: 685, w: 204, h: 10, en: "Light Air-Cured · recommended N 150–200 kg/ha · max yield 5.6 t/ha", es: "Light Air-Cured · N recomendado 150–200 kg/ha · rend. máx 5.6 t/ha", background: W, color: MUTED },
      { x: 27, y: 710, w: 82, h: 13, en: "Target yield (t/ha)", es: "Rendimiento objetivo (t/ha)", background: W, color: TXT, weight: 600 },
      { x: 189, y: 710, w: 62, h: 13, en: "Total N (kg)", es: "Kg N total", background: W, color: TXT, weight: 600 },
      { x: 27, y: 764, w: 90, h: 10, en: "Recommended range: 4–5.6 t/ha", es: "Rango recomendado: 4–5.6 t/ha", background: W, color: MUTED },
      { x: 189, y: 764, w: 106, h: 10, en: "Regulatory range: 150–200 kg/ha", es: "Rango normativo: 150–200 kg/ha", background: W, color: MUTED },
      { x: 27, y: 788, w: 58, h: 13, en: "Transplant date", es: "Fecha de trasplante", background: W, color: TXT, weight: 600 },
      { x: 33, y: 815, w: 56, h: 15, en: "dd/mm/yyyy", es: "dd/mm/aaaa", background: W, color: TXT },
      { x: 27, y: 842, w: 158, h: 10, en: "Optional — if set, days are calculated automatically", es: "Opcional — si se indica, calcula los días automáticamente", background: W, color: MUTED },
      { x: 27, y: 865, w: 96, h: 13, en: "Seedling age at transplant", es: "Edad de plántula al trasplante", background: W, color: TXT, weight: 600 },
      { x: 58, y: 893, w: 44, h: 13, en: "Standard", es: "Estándar", background: GBTN, color: W, weight: 700, align: "middle" },
      { x: 52, y: 909, w: 56, h: 10, en: "25–35 d nursery", es: "25–35 d vivero", background: GBTN, color: "#e4f2e8", align: "middle" },
      { x: 164, y: 893, w: 48, h: 13, en: "Advanced", es: "Avanzada", background: W, color: TXT, align: "middle" },
      { x: 160, y: 909, w: 56, h: 10, en: "35–45 d nursery", es: "35–45 d vivero", background: W, color: MUTED, align: "middle" },
      { x: 262, y: 893, w: 64, h: 13, en: "Extra-advanced", es: "Extra avanzada", background: W, color: TXT, align: "middle" },
      { x: 266, y: 909, w: 56, h: 10, en: "> 45 d nursery", es: "> 45 d vivero", background: W, color: MUTED, align: "middle" },
      { x: 27, y: 954, w: 76, h: 13, en: "Days since transplant", es: "Días desde el trasplante", background: W, color: TXT, weight: 600 },
      { x: 27, y: 1008, w: 82, h: 10, en: "Reference NDVI: 0.400", es: "NDVI de referencia: 0.400", background: W, color: MUTED },
      { x: 382, y: 512, w: 42, h: 14, en: "Results", es: "Resultados", background: "#eef9f1", color: G, weight: 700 },
      { x: 397, y: 534, w: 132, h: 11, en: "21–35 d band — optimal NDVI: 0.400", es: "Franja 21–35 d — NDVI óptimo: 0.400", background: "#dcf1e3", color: G, weight: 600 },
      { x: 386, y: 550, w: 268, h: 11, en: "≤ 20 d: 0.30   21–35 d: 0.40   36–50 d: 0.62   51–65 d: 0.74   > 65 d: 0.70", es: "≤ 20 d: 0.30   21–35 d: 0.40   36–50 d: 0.62   51–65 d: 0.74   > 65 d: 0.70", background: "#dcf1e3", color: "#3f7a55" },
      { x: 382, y: 581, w: 50, h: 12, en: "Mean NDVI:", es: "NDVI medio:", background: "#f2faf4", color: TXT },
      { x: 535, y: 581, w: 60, h: 12, en: "Optimal NDVI:", es: "NDVI óptimo:", background: "#f2faf4", color: TXT },
      { x: 382, y: 607, w: 60, h: 12, en: "Deviation:", es: "Desviación:", background: "#f2faf4", color: TXT },
      { x: 382, y: 648, w: 64, h: 14, en: "To apply:", es: "A distribuir:", background: "#f2faf4", color: TXT, weight: 700 },
      { x: 400, y: 705, w: 186, h: 17, en: "Save observation", es: "Guardar observación", background: GBTN, color: W, weight: 700, align: "middle" },
      { x: 390, y: 753, w: 50, h: 10, en: "Grid points", es: "Puntos cuadrícula", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 466, y: 753, w: 44, h: 10, en: "Min dose", es: "Dosis mín", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 552, y: 753, w: 52, h: 10, en: "Mean dose", es: "Dosis media", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 633, y: 753, w: 44, h: 10, en: "Max dose", es: "Dosis máx", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 374, y: 782, w: 128, h: 9, en: "UTM zone 33N · 22 control points · p = 2", es: "Zona UTM 33N · 22 puntos de control · p = 2", background: W, color: MUTED },
      { x: 381, y: 995, w: 114, h: 9, en: "Hover the map to see values", es: "Pasa el cursor por el mapa", background: MAPTIP, color: "#eeeeee" },
    ],
  },
  5: {
    viewW: 1024, viewH: 546, native: { w: 1295, h: 691 },
    alt: {
      it: "Registro osservazioni con grafico NDVI–azoto e mappa IDW del poligono importato.",
      en: "Observation log with NDVI–nitrogen chart and IDW map of the imported polygon.",
      es: "Registro de observaciones con gráfico NDVI–nitrógeno y mapa IDW del polígono importado.",
    },
    regions: [
      { x: 8, y: 80, w: 104, h: 40, en: "Observation\nLog", es: "Registro de\nobservaciones", background: W, color: G, weight: 700 },
      { x: 9, y: 123, w: 54, h: 13, en: "22 records", es: "22 registros", background: W, color: MUTED },
      { x: 178, y: 90, w: 68, h: 36, en: "Reset\nlog", es: "Reiniciar\nregistro", background: W, color: "#c0392b", weight: 700, align: "middle" },
      { x: 304, y: 92, w: 50, h: 32, en: "Export\nCSV", es: "Exportar\nCSV", background: W, color: TXT, weight: 700, align: "middle" },
      { x: 414, y: 92, w: 50, h: 32, en: "Export\nPDF", es: "Exportar\nPDF", background: GBTN, color: W, weight: 700, align: "middle" },
      { x: 24, y: 166, w: 214, h: 17, en: "NDVI distribution and indicated nitrogen", es: "Distribución NDVI y nitrógeno indicado", background: "#f3faf5", color: "#1b2a20", weight: 700 },
      { x: 24, y: 186, w: 444, h: 27, en: "Each point is a saved observation. Right of zero, mean NDVI is below the reference; the height\nshows the kg N/ha indicated by the point.", es: "Cada punto es una observación guardada. A la derecha del cero el NDVI medio está bajo la referencia;\nla altura muestra los kg N/ha indicados por el punto.", background: "#f3faf5", color: "#3a423d" },
      { x: 189, y: 228, w: 38, h: 14, en: "Tobacco", es: "Tabaco", background: "#f3faf5", color: TXT },
      { x: 246, y: 228, w: 58, h: 14, en: "Durum wheat", es: "Trigo duro", background: "#f3faf5", color: TXT },
      { x: 84, y: 252, w: 48, h: 11, en: "Expected NDVI", es: "NDVI esperado", background: "#f3faf5", color: "#555" },
      { x: 28, y: 252, w: 14, h: 92, en: "Indicated N (kg N/ha)", es: "N indicado (kg N/ha)", background: "#f3faf5", color: "#555", rotate: -90 },
      { x: 184, y: 451, w: 164, h: 14, en: "NDVI deviation (expected − mean)", es: "Desviación NDVI (esperado − medio)", background: "#f3faf5", color: "#555", align: "middle" },
      { x: 24, y: 479, w: 444, h: 26, en: "A point at zero kg N/ha means NDVI at or above the reference, or a plan already used up. The\nchart does not identify the cause of the deviation on its own.", es: "Un punto en cero kg N/ha indica NDVI igual o superior a la referencia, o un plan ya agotado. El\ngráfico no identifica por sí solo la causa de la desviación.", background: "#f3faf5", color: "#3a423d" },
      { x: 33, y: 519, w: 206, h: 13, en: "Accessible list of chart points (22)", es: "Lista accesible de puntos del gráfico (22)", background: W, color: G, weight: 700 },
      { x: 542, y: 101, w: 108, h: 17, en: "Import Polygons", es: "Importar polígonos", background: W, color: "#1b2a20", weight: 700 },
      { x: 958, y: 134, w: 46, h: 16, en: "Browse", es: "Examinar", background: GBTN, color: W, weight: 700 },
      { x: 582, y: 179, w: 58, h: 11, en: "Grid points", es: "Puntos cuadrícula", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 688, y: 179, w: 48, h: 11, en: "Min dose", es: "Dosis mín", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 786, y: 179, w: 54, h: 11, en: "Mean dose", es: "Dosis media", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 888, y: 179, w: 50, h: 11, en: "Max dose", es: "Dosis máx", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 570, y: 211, w: 140, h: 10, en: "UTM zone 33N · 22 control points · p = 2", es: "Zona UTM 33N · 22 puntos de control · p = 2", background: W, color: MUTED },
      { x: 581, y: 483, w: 136, h: 10, en: "Hover the map to see values", es: "Pasa el cursor por el mapa", background: MAPTIP, color: "#eeeeee" },
    ],
  },
  6: {
    viewW: 1024, viewH: 644, native: { w: 1036, h: 652 },
    alt: {
      it: "Parametri colturali del grano duro e conferma della fase fenologica BBCH.",
      en: "Durum wheat crop parameters and BBCH growth-stage confirmation.",
      es: "Parámetros del cultivo de trigo duro y confirmación de la fase fenológica BBCH.",
    },
    regions: [
      { x: 16, y: 17, w: 134, h: 17, en: "Crop Parameters", es: "Parámetros del cultivo", background: W, color: G, weight: 700 },
      { x: 16, y: 60, w: 44, h: 14, en: "Crop", es: "Cultivo", background: W, color: TXT, weight: 600 },
      { x: 29, y: 88, w: 74, h: 16, en: "Durum wheat", es: "Trigo duro", background: W, color: TXT },
      { x: 16, y: 125, w: 44, h: 14, en: "Variety", es: "Variedad", background: W, color: TXT, weight: 600 },
      { x: 16, y: 180, w: 274, h: 12, en: "Select the variety and enter the seed quantity to assess.", es: "Selecciona la variedad e introduce la cantidad de semilla a evaluar.", background: W, color: MUTED },
      { x: 16, y: 205, w: 98, h: 14, en: "Seeding density", es: "Densidad de siembra", background: W, color: TXT, weight: 600 },
      { x: 395, y: 233, w: 76, h: 17, en: "kg seed/ha", es: "kg semilla/ha", background: W, color: TXT },
      { x: 16, y: 263, w: 484, h: 24, en: "Input: 215.0 kg seed/ha · estimated equivalent: 4.249.012 seeds/ha (425 seeds/m²) · N density coefficient:\n×1.00", es: "Entrada: 215.0 kg semilla/ha · equivalente estimado: 4.249.012 semillas/ha (425 semillas/m²) · coef. densidad N:\n×1.00", background: W, color: MUTED },
      { x: 16, y: 301, w: 126, h: 14, en: "Target yield (q/ha)", es: "Rendimiento objetivo (q/ha)", background: W, color: TXT, weight: 600 },
      { x: 262, y: 301, w: 182, h: 14, en: "Calculated total N requirement", es: "Necesidad total de N calculada", background: W, color: TXT, weight: 600 },
      { x: 16, y: 354, w: 234, h: 24, en: "Advisory reference: 40 q/ha = 120, 50 = 150, 60\n= 180 kg N/ha.", es: "Referencia orientativa: 40 q/ha = 120, 50 = 150, 60\n= 180 kg N/ha.", background: W, color: MUTED },
      { x: 262, y: 354, w: 236, h: 24, en: "Requirement: 150 kg N/ha × density 1.00 = 150 kg\nN/ha", es: "Necesidad: 150 kg N/ha × densidad 1.00 = 150 kg\nN/ha", background: W, color: MUTED },
      { x: 16, y: 395, w: 164, h: 14, en: "N already applied (kg N/ha)", es: "N ya aplicado (kg N/ha)", background: W, color: TXT, weight: 600 },
      { x: 16, y: 451, w: 226, h: 24, en: "Total inputs applied since the start of the crop:\nsubtracted from the plan's total nitrogen.", es: "Total de aportes desde el inicio del cultivo:\nse resta del nitrógeno total del plan.", background: W, color: MUTED },
      { x: 29, y: 499, w: 136, h: 13, en: "Declared density correction", es: "Corrección de densidad declarada", background: "#fdf6d8", color: "#4a3800", weight: 700 },
      { x: 29, y: 516, w: 444, h: 36, en: "Base requirement follows a technical reference of 3 kg N per expected quintal. Density changes\nthis value only to a limited extent: coefficient from ×0.90 to ×1.10, calculated against the variety's\ninternal technical reference.", es: "La necesidad base sigue una referencia técnica de 3 kg N por quintal esperado. La densidad modifica\neste valor solo de forma limitada: coeficiente de ×0,90 a ×1,10, calculado respecto a la referencia\ntécnica interna de la variedad.", background: "#fdf6d8", color: "#4a3800" },
      { x: 29, y: 560, w: 444, h: 25, en: "The reference TKW (50.6 g) is only used to convert kg/ha and seeds/m²: the reference table does not\ndeclare a TKW, so the entered dose is checked directly against its own kg/ha range.", es: "El PMG de referencia (50.6 g) solo sirve para convertir kg/ha y semillas/m²: la tabla de referencia no\ndeclara un PMG, así que la dosis se verifica directamente en su propio intervalo kg/ha.", background: "#fdf6d8", color: "#4a3800" },
      { x: 29, y: 590, w: 446, h: 25, en: "Technical assessment of soil analysis, previous crop, rainfall and residual nitrogen is still\nrequired: the app applies no automatic corrections for these factors.", es: "Siguen siendo necesarias valoraciones técnicas de análisis de suelo, cultivo previo, lluvias y nitrógeno\nresidual: la app no aplica correcciones automáticas para estos factores.", background: "#fdf6d8", color: "#4a3800" },
      { x: 521, y: 12, w: 70, h: 14, en: "Sowing date", es: "Fecha de siembra", background: W, color: TXT, weight: 600 },
      { x: 534, y: 92, w: 180, h: 14, en: "Growth stage: confirm BBCH", es: "Fase fenológica: confirmar BBCH", background: "#ebf3fd", color: "#1c3a66", weight: 700 },
      { x: 534, y: 108, w: 440, h: 12, en: "DAS is a local estimate: select the BBCH observed in the field before using the nitrogen share.", es: "Los DAS son una estimación local: selecciona el BBCH observado en campo antes de usar la cuota de N.", background: "#ebf3fd", color: "#2a5fa8" },
      { x: 843, y: 136, w: 140, h: 15, en: "Suggest from DAS estimate · 20–29", es: "Proponer según DAS · 20–29", background: W, color: "#1c3a66", weight: 700, align: "middle" },
      { x: 534, y: 144, w: 128, h: 14, en: "Field-observed BBCH", es: "BBCH observado en campo", background: "#ebf3fd", color: TXT, weight: 600 },
      { x: 546, y: 170, w: 176, h: 17, en: "00–09 · Sowing / emergence", es: "00–09 · Siembra / emergencia", background: W, color: TXT },
      { x: 844, y: 171, w: 140, h: 16, en: "Confirm BBCH reading", es: "Confirmar lectura BBCH", background: GBTN, color: W, weight: 700, align: "middle" },
      { x: 534, y: 202, w: 440, h: 24, en: "Local DAS estimate: 87 DAS → 20–29 · Tillering. It can only prefill the selector: check in\nthe field and use \"Confirm BBCH reading\" to activate the share.", es: "Estimación DAS local: 87 DAS → 20–29 · Ahijamiento. Solo puede precompletar el selector: verifica en\ncampo y usa \"Confirmar lectura BBCH\" para activar la cuota.", background: "#ebf3fd", color: "#2a5fa8" },
      { x: 534, y: 236, w: 428, h: 13, en: "BBCH selected but not confirmed: nitrogen share and stage saving remain locked.", es: "BBCH seleccionado pero no confirmado: cuota de N y guardado de la fase siguen bloqueados.", background: "#ebf3fd", color: "#b4501c", weight: 600 },
      { x: 544, y: 288, w: 270, h: 17, en: "Reference growth-stage calendar", es: "Calendario fenológico de referencia", background: "#fafafa", color: TXT, weight: 700 },
      { x: 544, y: 343, w: 294, h: 15, en: "Configure local DAS windows to suggest the BBCH", es: "Configura las ventanas DAS locales para proponer el BBCH", background: "#fafafa", color: TXT, weight: 700 },
      { x: 521, y: 384, w: 136, h: 14, en: "DAS · days after sowing", es: "DAS · días tras la siembra", background: W, color: TXT, weight: 600 },
      { x: 521, y: 440, w: 234, h: 25, en: "Calculated from the sowing date · local estimate: 20–29 ·\nTillering", es: "Calculado desde la fecha de siembra · estimación local: 20–29 ·\nAhijamiento", background: W, color: MUTED },
    ],
  },
  7: {
    viewW: 517, viewH: 618, native: { w: 517, h: 618 },
    alt: {
      it: "Letture NDVI del punto di grano duro e piano azoto con fasi BBCH.",
      en: "NDVI readings for the durum wheat point and nitrogen plan with BBCH stages.",
      es: "Lecturas NDVI del punto de trigo duro y plan de nitrógeno con fases BBCH.",
    },
    regions: [
      { x: 14, y: 5, w: 206, h: 19, en: "NDVI readings — wheat point", es: "Lecturas NDVI — punto de trigo", background: W, color: G, weight: 700 },
      { x: 14, y: 37, w: 484, h: 26, en: "Enter five representative readings for the point. The mean prudently adjusts the BBCH share, but does not\ndiagnose a nitrogen deficiency on its own.", es: "Introduce cinco lecturas representativas del punto. La media modula con prudencia la cuota BBCH, pero no\ndiagnostica por sí sola una carencia de nitrógeno.", background: W, color: "#555" },
      misura(14, 79, 1, 52, 14), misura(180, 79, 2, 52, 14), misura(346, 79, 3, 52, 14), misura(14, 146, 4, 52, 14), misura(180, 146, 5, 52, 14),
      { x: 33, y: 232, w: 226, h: 17, en: "Point N plan · durum wheat", es: "Plan de N del punto · trigo duro", background: "#eef9f1", color: G, weight: 700 },
      { x: 33, y: 250, w: 454, h: 26, en: "Yield and density estimate the plan; the gap between mean and reference NDVI sets the N share\nindicated for the point. The result is advice to be validated in the field.", es: "Rendimiento y densidad estiman el plan; el déficit entre NDVI medio y referencia determina la cuota N\nindicada en el punto. El resultado es un consejo a validar en campo.", background: "#eef9f1", color: "#2a6a45" },
      { x: 33, y: 292, w: 76, h: 32, en: "Base\nrequirement:", es: "Necesidad\nbase:", background: "#eef9f1", color: TXT },
      { x: 186, y: 292, w: 74, h: 32, en: "Adjusted\nrequirement:", es: "Necesidad\ncorregida:", background: "#eef9f1", color: TXT },
      { x: 338, y: 301, w: 94, h: 15, en: "N already applied:", es: "N ya aplicado:", background: "#eef9f1", color: TXT },
      { x: 33, y: 337, w: 82, h: 32, en: "Remaining\nplan N:", es: "N restante\ndel plan:", background: "#eef9f1", color: TXT },
      { x: 186, y: 346, w: 108, h: 15, en: "Point mean NDVI:", es: "NDVI medio punto:", background: "#eef9f1", color: TXT },
      { x: 335, y: 346, w: 100, h: 15, en: "Reference NDVI:", es: "NDVI referencia:", background: "#eef9f1", color: TXT },
      { x: 33, y: 390, w: 74, h: 15, en: "NDVI deficit:", es: "Déficit NDVI:", background: "#eef9f1", color: TXT },
      { x: 186, y: 383, w: 68, h: 32, en: "Expected stage\nfrom DAS:", es: "Fase esperada\nsegún DAS:", background: "#eef9f1", color: TXT },
      { x: 256, y: 383, w: 78, h: 32, en: "20–29 ·\nTillering", es: "20–29 ·\nAhijamiento", background: "#eef9f1", color: "#1b2a20", weight: 700 },
      { x: 338, y: 383, w: 74, h: 32, en: "Confirmed\nBBCH:", es: "BBCH\nconfirmado:", background: "#eef9f1", color: TXT },
      { x: 417, y: 383, w: 70, h: 32, en: "to be\nconfirmed", es: "por\nconfirmar", background: "#eef9f1", color: G, weight: 700 },
      { x: 33, y: 427, w: 84, h: 32, en: "N indicated by\nNDVI point:", es: "N indicado por\npunto NDVI:", background: "#eef9f1", color: TXT },
      { x: 118, y: 427, w: 70, h: 32, en: "to be\nconfirmed", es: "por\nconfirmar", background: "#eef9f1", color: G, weight: 700 },
      { x: 41, y: 485, w: 404, h: 14, en: "Survey and confirm BBCH in the field to get the nitrogen share for the correct stage.", es: "Observa y confirma el BBCH en campo para obtener la cuota de N de la fase correcta.", background: W, color: "#b4501c", weight: 600 },
      { x: 41, y: 500, w: 454, h: 28, en: "NDVI below the reference by 0.065: check in the field before application. The gap may\nalso depend on water, soil, disease or unevenness, not only on nitrogen.", es: "NDVI por debajo de la referencia en 0.065: verifica en campo antes de distribuir. La diferencia puede\ndepender también de agua, suelo, enfermedades o desuniformidad, no solo del nitrógeno.", background: W, color: "#b4501c", weight: 600 },
      { x: 39, y: 552, w: 218, h: 14, en: "00–09 · Sowing / emergence · 27–36 kg N/ha", es: "00–09 · Siembra / emergencia · 27–36 kg N/ha", background: W, color: "#444" },
      { x: 267, y: 552, w: 192, h: 14, en: "20–29 · Tillering · 40–50 kg N/ha", es: "20–29 · Ahijamiento · 40–50 kg N/ha", background: W, color: "#444" },
      { x: 39, y: 585, w: 194, h: 14, en: "30–32 · Stem elongation · 40–60 kg N/ha", es: "30–32 · Inicio encañado · 40–60 kg N/ha", background: W, color: "#444" },
      { x: 267, y: 585, w: 214, h: 14, en: "37–39 · Flag leaf · 20–30 kg N/ha", es: "37–39 · Hoja bandera · 20–30 kg N/ha", background: W, color: "#444" },
    ],
  },
  8: {
    viewW: 518, viewH: 560, native: { w: 518, h: 560 },
    alt: {
      it: "Mappa IDW della dose azotata sul poligono con export Shapefile e GeoTIFF.",
      en: "IDW nitrogen dose map over the polygon with Shapefile and GeoTIFF export.",
      es: "Mapa IDW de dosis de nitrógeno sobre el polígono con exportación Shapefile y GeoTIFF.",
    },
    regions: [
      { x: 30, y: 17, w: 74, h: 12, en: "Grid points", es: "Puntos cuadrícula", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 160, y: 17, w: 56, h: 12, en: "Min dose", es: "Dosis mín", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 280, y: 17, w: 64, h: 12, en: "Mean dose", es: "Dosis media", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 408, y: 17, w: 58, h: 12, en: "Max dose", es: "Dosis máx", background: STAT, color: "#4a5a50", align: "middle" },
      { x: 4, y: 64, w: 180, h: 12, en: "UTM zone 33N · 22 control points · p = 2", es: "Zona UTM 33N · 22 puntos de control · p = 2", background: "#fbfbfb", color: MUTED },
      { x: 17, y: 406, w: 176, h: 12, en: "Hover the map to see values", es: "Pasa el cursor por el mapa", background: MAPTIP, color: "#eeeeee" },
      { x: 70, y: 457, w: 132, h: 16, en: "Download Shapefile (.zip)", es: "Descargar Shapefile (.zip)", background: "#1f4fd8", color: W, weight: 700 },
      { x: 328, y: 457, w: 120, h: 16, en: "Download GeoTIFF (.tif)", es: "Descargar GeoTIFF (.tif)", background: "#4b30cf", color: W, weight: 700 },
      { x: 4, y: 494, w: 508, h: 40, en: "Shapefile: Point layer with dose attributes and N summary, plus summary CSV · WGS84 (EPSG:4326)\nGeoTIFF: single-band Float32 with summary in metadata · NODATA = −9999 · readable in QGIS, ArcGIS,\nGDAL", es: "Shapefile: capa Point con atributos de dosis y resumen de N, más CSV resumen · WGS84 (EPSG:4326)\nGeoTIFF: Float32 monobanda con resumen en metadatos · NODATA = −9999 · legible con QGIS, ArcGIS,\nGDAL", background: "#fbfbfb", color: MUTED },
    ],
  },
  9: {
    viewW: 1024, viewH: 501, native: { w: 1553, h: 760 },
    alt: {
      it: "Tabella del risparmio di azoto sull'intero poligono: piano 180 kg N/ha, IDW 72,5 kg N/ha.",
      en: "Nitrogen saving table for the whole polygon: plan 180 kg N/ha, IDW 72.5 kg N/ha.",
      es: "Tabla de ahorro de nitrógeno en todo el polígono: plan 180 kg N/ha, IDW 72,5 kg N/ha.",
    },
    regions: [
      { x: 49, y: 33, w: 462, h: 29, en: "Nitrogen saving across the whole polygon", es: "Ahorro de nitrógeno en todo el polígono", background: "#eaf8ef", color: "#16241b", weight: 700 },
      { x: 49, y: 73, w: 912, h: 46, en: "Comparison between the plan's total kg of nitrogen and the dose indicated by the IDW map. Calculated area: 0.59\nha.", es: "Comparación entre los kg de nitrógeno total del plan y la dosis indicada por el mapa IDW. Superficie calculada: 0.59\nha.", background: "#eaf8ef", color: "#2a6a45" },
      { x: 49, y: 160, w: 104, h: 18, en: "SCENARIO", es: "ESCENARIO", background: "#f6f7f6", color: "#555", weight: 700 },
      { x: 762, y: 160, w: 204, h: 18, en: "KG N ON POLYGON", es: "KG N EN EL POLÍGONO", background: "#f6f7f6", color: "#555", weight: 700, align: "start" },
      { x: 112, y: 222, w: 258, h: 26, en: "Nitrogen planned", es: "Nitrógeno previsto", background: W, color: "#1b1f1c", weight: 700, align: "middle" },
      { x: 112, y: 290, w: 258, h: 26, en: "Nitrogen indicated by IDW", es: "Nitrógeno indicado por IDW", background: W, color: "#1b1f1c", weight: 700, align: "middle" },
      { x: 143, y: 358, w: 196, h: 26, en: "Estimated saving", es: "Ahorro estimado", background: "#ecf8f0", color: "#1b1f1c", weight: 700, align: "middle" },
      { x: 49, y: 419, w: 880, h: 42, en: "Per-hectare values are averages interpolated from the GPS points of the NDVI log. Totals are calculated over the\nfull polygon area.", es: "Los valores por hectárea son medias interpoladas de los puntos GPS del registro NDVI. Los totales se calculan sobre la\nsuperficie completa del polígono.", background: W, color: "#666" },
    ],
  },
};
