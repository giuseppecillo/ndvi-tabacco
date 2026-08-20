import assert from "node:assert/strict";
import test from "node:test";
import { erroreOsservazioneGrano, erroreOsservazioneTabacco } from "./osservazioni";

const pianoGranoValido = (): Record<string, unknown> => ({
  coltura: "grano duro",
  giorni: 130,
  bbch: "20–29",
  faseFonte: "BBCH confermato in campo",
  faseFenologica: "Accestimento",
  n1: 0.4,
  n2: 0.4,
  n3: 0.4,
  n4: 0.4,
  n5: 0.4,
  media: 0.4,
  ottimale: 0.5411764705882353,
  discostamento: 0.1411764705882353,
  azotoTotale: 150,
  azotoGiaDistribuito: 60,
  dose: 12,
  quotaAzoto: 12,
});

const pianoTabaccoValido = (): Record<string, unknown> => ({
  coltura: "tabacco",
  giorni: 42,
  etaPiantina: "standard",
  resa: 4.5,
  n1: 0.5,
  n2: 0.5,
  n3: 0.5,
  n4: 0.5,
  n5: 0.5,
  media: 0.5,
  ottimale: 0.64,
  discostamento: 0.14,
  fabbisognoN: 120,
  azotoTotale: 120,
  dose: 26.3,
});

test("accepts the canonical grain plan produced by the app", () => {
  assert.equal(erroreOsservazioneGrano(pianoGranoValido()), null);
});

test("accepts the proportional tobacco NDVI plan", () => {
  assert.equal(erroreOsservazioneTabacco(pianoTabaccoValido()), null);
});

test("requires zero N for tobacco at or above its NDVI reference", () => {
  const piano = pianoTabaccoValido();
  piano.n1 = 0.8;
  piano.n2 = 0.8;
  piano.n3 = 0.8;
  piano.n4 = 0.8;
  piano.n5 = 0.8;
  piano.media = 0.8;
  piano.discostamento = 0;
  piano.dose = 0;
  assert.equal(erroreOsservazioneTabacco(piano), null);

  piano.dose = 1;
  assert.match(erroreOsservazioneTabacco(piano) ?? "", /dose tabacco/);
});

test("requires zero N when the observed NDVI is at or above its reference", () => {
  const piano = pianoGranoValido();
  piano.n1 = 0.6;
  piano.n2 = 0.6;
  piano.n3 = 0.6;
  piano.n4 = 0.6;
  piano.n5 = 0.6;
  piano.media = 0.6;
  piano.discostamento = -0.05882352941176472;
  piano.dose = 0;
  piano.quotaAzoto = 0;
  assert.equal(erroreOsservazioneGrano(piano), null);

  piano.dose = 12;
  piano.quotaAzoto = 12;
  assert.match(erroreOsservazioneGrano(piano) ?? "", /quota ricalcolata/);
});

test("rejects missing, blank, and boolean NDVI readings", () => {
  for (const valore of [null, "", true, undefined]) {
    const piano = pianoGranoValido();
    piano.n1 = valore;
    assert.match(erroreOsservazioneGrano(piano) ?? "", /NDVI/);
  }
});

test("rejects incomplete grain nitrogen plan values", () => {
  const piano = pianoGranoValido();
  delete piano.azotoGiaDistribuito;
  assert.match(erroreOsservazioneGrano(piano) ?? "", /non sono completi/);
});