// Manual, one-off Production pilot check. Paste into the signed-in browser
// console only. Never run in development or with copied credentials/tokens.
(async () => {
  const id = "QA-MIGRAZIONE-20261108";
  const endpoint = "/api/osservazioni";
  let stage = "ORIGINE";
  try {
    if (location.origin !== "https://agri-precision-hub.replit.app") {
      throw new Error("ORIGINE_NON_AUTORIZZATA");
    }
    async function request(method, path, body) {
      const response = await fetch(path, {
        method, credentials: "same-origin", cache: "no-store",
        ...(body ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        } : {}),
      });
      if (!response.ok) throw new Error("HTTP_" + response.status);
      return response.json();
    }
    async function findTest() {
      const rows = await request("GET", endpoint);
      if (!Array.isArray(rows)) throw new Error("RISPOSTA_NON_VALIDA");
      return rows.filter(row => row.id === id);
    }
    stage = "LETTURA";
    const found = await findTest();
    if (found.length !== 1 || found[0].coltura !== "tabacco"
      || String(found[0].cliente).trim().toUpperCase() !== "TEST MIGRAZIONE"
      || String(found[0].appezzamento).trim().toUpperCase() !== "SINTETICO") {
      throw new Error("RILIEVO_SINTETICO_NON_IDENTIFICATO");
    }
    stage = "AGGIORNAMENTO";
    // Deliberately synthetic NDVI=1 and zero N budget/dose, not field advice.
    await request("POST", endpoint, {
      ...found[0], appezzamento: "SINTETICO-AGGIORNATO",
      n1: 1, n2: 1, n3: 1, n4: 1, n5: 1, media: 1,
      fabbisognoN: 0, azotoTotale: 0, azotoGiaDistribuito: 0,
      discostamento: 0, dose: 0, quotaAzoto: 0, lat: null, lng: null,
    });
    stage = "RILETTURA_AGGIORNAMENTO";
    const updated = await findTest();
    if (updated.length !== 1
      || updated[0].cliente !== found[0].cliente
      || updated[0].appezzamento !== "SINTETICO-AGGIORNATO"
      || updated[0].n1 !== 1 || updated[0].media !== 1 || updated[0].dose !== 0) {
      throw new Error("AGGIORNAMENTO_NON_CONFERMATO");
    }
    stage = "ELIMINAZIONE";
    await request("DELETE", endpoint + "/" + encodeURIComponent(id));
    stage = "VERIFICA_ELIMINAZIONE";
    if ((await findTest()).length !== 0) throw new Error("RILIEVO_ANCORA_PRESENTE");
    console.log("COLLAUDO_COMPLETATO_UPDATE_DELETE");
  } catch (error) {
    const code = error instanceof Error &&
      /^(HTTP_[0-9]{3}|ORIGINE_NON_AUTORIZZATA|RISPOSTA_NON_VALIDA|RILIEVO_SINTETICO_NON_IDENTIFICATO|AGGIORNAMENTO_NON_CONFERMATO|RILIEVO_ANCORA_PRESENTE)$/.test(error.message)
      ? error.message : "ERRORE_NON_CLASSIFICATO";
    console.error("COLLAUDO_INTERROTTO", stage, code);
  }
})();
