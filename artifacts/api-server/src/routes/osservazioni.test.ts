import assert from "node:assert/strict";
import test from "node:test";
import { erroreOsservazioneGrano } from "./osservazioni";

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

test("accepts the canonical grain plan produced by the app", () => {
  assert.equal(erroreOsservazioneGrano(pianoGranoValido()), null);
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