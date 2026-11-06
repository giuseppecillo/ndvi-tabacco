# Verifica PDF multilingue — 6 novembre 2026

## Metodo e riservatezza

Il controllo usa esclusivamente fixture sintetiche, senza accesso al registro,
alle API dei rilievi o al database. Il generatore invocato dai test è lo stesso
usato dal pulsante PDF dell'app, separato dalla UI per poterlo verificare senza
autenticazione o caricamento di dati reali.

Sono stati generati e aperti con PyMuPDF 12 PDF (21 pagine):
registro vuoto, un rilievo, due rilievi con accenti e 90 rilievi su quattro pagine,
per italiano, inglese e spagnolo. Tutte le pagine sono state renderizzate;
sono state ispezionate visivamente le tre versioni con accenti e l'ultima
pagina del report spagnolo multipagina.

## Esito

- Intestazioni, titolo, data di esportazione e piè di pagina tradotti.
- Date di esportazione e rilievo locali, senza conversione UTC delle date civili.
- Virgola decimale in italiano/spagnolo e punto in inglese, stessa precisione
  preesistente (letture 2, statistiche 3, dose 1, coordinate 6 decimali).
- Caratteri `ñ á é í ó ú ü ¡ ¿ è` preservati nel testo PDF e leggibili nel rendering.
- Nomi `Media` e `Fioritura` mantenuti letteralmente anche nelle lingue straniere,
  pur essendo parole presenti nel catalogo delle traduzioni.
- Valori sintetici NDVI, dose, coordinate negative e coordinate assenti
  preservati; nessuna mutazione degli oggetti agronomici originali.
- Tutti i 90 ID presenti nel report lungo, intestazione ripetuta e piè di pagina
  su ciascuna pagina; nessuna parola fuori dai margini fisici.
- Dose positiva evidenziata in rosso nella colonna corretta (non nella latitudine).
- Data di semina disponibile anche per i rilievi di grano, con intestazione
  comune «Semina / trapianto».
- 52 test superati, controllo TypeScript e build superati.

Il controllo non simula il click/download nel browser autenticato; verifica i
byte dei PDF reali prodotti dallo stesso generatore. La pagina pubblica di
accesso è stata controllata dopo il riavvio del frontend.
Il font PDF standard copre gli accenti qui verificati, non tutti gli alfabeti
Unicode possibili nei nomi liberi.

## Riproduzione dalla radice del progetto

```sh
REPORT_PDF_DIR="$PWD/generated-artifacts/pdf-localization" \
  pnpm --filter @workspace/ndvi-tabacco test
uv run python scripts/verify-observation-pdfs.py generated-artifacts/pdf-localization
pnpm --filter @workspace/ndvi-tabacco typecheck
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/ndvi-tabacco build
```

PDF e PNG generati restano in `generated-artifacts/`, esclusa da Git e dalla
pubblicazione. Lo script Python richiede PyMuPDF, già dichiarato nel progetto.
