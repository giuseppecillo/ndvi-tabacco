import assert from "node:assert/strict";
import test from "node:test";
import { calcolaPomodoro, erroreOsservazionePomodoro, FASI_POMODORO, POMODORO_DB, PRIMO_POMODORO } from "@workspace/tomato-calculations";
import { serieDistribuzioneOsservazioni } from "./observationDistribution";
import { setLanguage, t } from "./i18n/runtime";

const input = {
  varieta: PRIMO_POMODORO, fase: "Sviluppo", confermata: true,
  resa: 100, azotoGiaDistribuito: 0, letture: [0.2, 0.2, 0.2, 0.2, 0.2],
};
test("525 unique varieties remain with the two user-selected homonym profiles", () => {
  const profiles = Object.values(POMODORO_DB);
  assert.equal(profiles.length, 525);
  assert.equal(new Set(profiles.map(p => p.nome)).size, 525);
  const roma = profiles.filter(p => p.nome === "Roma VF");
  assert.equal(roma.length, 1);
  assert.equal(roma[0].destinazione, "Industria");
  assert.equal(roma[0].impiego, "Pelato Intero / Polpa");
  assert.equal(roma[0].azotoTotale, 250);
  const gardeners = profiles.filter(p => p.nome === "Gardener's Delight");
  assert.equal(gardeners.length, 1);
  assert.equal(gardeners[0].impiego, "Ciliegino da Snack/Grappolo");
  assert.equal(gardeners[0].azotoTotale, 210);
  assert.equal(profiles.filter(p => p.destinazione === "Industria").length, 220);
  assert.equal(profiles.filter(p => p.destinazione === "Mensa").length, 305);
  assert.deepEqual(profiles[0].fasi, [[37.5, .3, .5], [75, .6, .75], [112.5, .75, .85], [25, .55, .65]]);
});
test("each profile and phase uses range mean, keeps original quotas and respects all dose limits", () => {
  for (const profile of Object.values(POMODORO_DB)) {
    for (const [index, fase] of FASI_POMODORO.entries()) {
      for (const scale of [0.5, 1, 2]) {
        const [quota, min, max] = profile.fasi[index];
        const target = (min + max) / 2;
        for (const reading of [0, target / 2, target, Math.min(1, target + .1)]) {
          for (const applied of [0, profile.azotoTotale * scale - .4,
            profile.azotoTotale * scale - .06, profile.azotoTotale * scale - .09, profile.azotoTotale * scale + 1]) {
            const r = calcolaPomodoro({ ...input, varieta: profile.id, fase, resa: profile.resa * scale,
              azotoGiaDistribuito: applied, letture: Array(5).fill(reading) });
            assert.equal(r.pronta, true);
            assert.equal(r.ottimale, target);
            assert.equal(r.quota, quota * scale);
            assert.ok(r.dose >= 0 && r.dose <= r.residuo && r.dose <= r.quota);
            if (r.residuo < .1) assert.equal(r.dose, 0, "a sub-tenth residual permits no representable dose");
            if (reading >= target || applied >= profile.azotoTotale * scale) assert.equal(r.dose, 0);
          }
        }
      }
    }
  }
});
test("explicit industry examples: total 250, mean reference .4, 50% deficit, dose18.8; residual cap", () => {
  const r = calcolaPomodoro(input);
  assert.equal(r.azotoTotale, 250);
  assert.equal(r.ottimale, .4);
  assert.equal(r.quota, 37.5);
  assert.equal(r.deficitRelativo, .5);
  assert.equal(r.dose, 18.8);
  assert.equal(calcolaPomodoro({ ...input, azotoGiaDistribuito: 249.7 }).dose, .3);
  assert.equal(calcolaPomodoro({ ...input, confermata: false }).dose, 0);
  assert.equal(calcolaPomodoro({ ...input, fase: "" }).pronta, false);
});
test("fresh-market references and yield scaling do not reuse tobacco or grain curves", () => {
  const id = Object.values(POMODORO_DB).find(p => p.nome === "Gardener's Delight" && p.impiego.startsWith("Ciliegino"))!.id;
  const r = calcolaPomodoro({ ...input, varieta: id, fase: "Fioritura", resa: 150, letture: Array(5).fill(.3625) });
  assert.equal(r.ottimale, .7250000000000001);
  assert.equal(r.azotoTotale, 420);
  assert.equal(r.quota, 126);
  assert.equal(r.dose, 63);
});
test("invalid input cannot produce advice", () => {
  for (const patch of [{ varieta: "unknown" }, { resa: 0 }, { resa: NaN }, { azotoGiaDistribuito: -1 },
    { letture: [0, 0, 0] }, { letture: [0, 0, 0, NaN, 0] }, { letture: [0, 0, 0, 1.1, 0] }]) {
    const r = calcolaPomodoro({ ...input, ...patch });
    assert.equal(r.valida, false);
    assert.equal(r.dose, 0);
  }
});
test("API guard independently rejects altered dose, reference, total, phase, density and nonnumeric input", () => {
  const payload: Record<string, unknown> = {
    varieta: PRIMO_POMODORO, faseFenologica: "Sviluppo", faseFonte: "Fase osservata in campo",
    resa: 100, azotoGiaDistribuito: 0, azotoTotale: 250, quotaAzoto: 18.8,
    dose: 18.8, media: .2, ottimale: .4, discostamento: .2,
    densitaValore: 30000, pianteHaEquivalenti: 30000, densitaUnita: "piante/ha", giorni: 20,
    n1: .2, n2: .2, n3: .2, n4: .2, n5: .2, bbch: null,
  };
  assert.equal(erroreOsservazionePomodoro(payload), null);
  for (const patch of [{ dose: 20 }, { ottimale: .5 }, { azotoTotale: 175 }, { quotaAzoto: 19 },
    { faseFonte: null }, { faseFenologica: "Unknown" }, { densitaUnita: "kg/ha" }, { pianteHaEquivalenti: 1 },
    { resa: "100" }, { dose: NaN }, { giorni: -1 }, { giorni: .5 }]) {
    assert.notEqual(erroreOsservazionePomodoro({ ...payload, ...patch }), null);
  }
});
test("tomato survives chart/history values and all new crop translations", () => {
  const points = serieDistribuzioneOsservazioni([{ id: "synthetic", coltura: "pomodoro", data: "2026-11-08",
    varieta: PRIMO_POMODORO, media: .2, ottimale: .4, dose: 18.8, quotaAzoto: 18.8 }]);
  assert.equal(points[0].coltura, "pomodoro");
  assert.equal(points[0].azotoIndicato, 18.8);
  for (const language of ["en", "es"] as const) {
    setLanguage(language);
    for (const text of ["Pomodoro", "Cerca varietà di pomodoro", "Sviluppo", "Ingrossamento", "Risultati pomodoro"]) {
      assert.notEqual(t(text), text);
    }
  }
  setLanguage("it");
});
