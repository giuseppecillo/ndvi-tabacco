# Esito della preparazione offline

Verifica del 2026-11-08, senza connessioni o creazione di database.

- Selezione rigenerata dall'allegato originale mediante `catalogue_selection.py`.
- CSV e controllo coincidono con i due SHA-256 in `selection-lock.json`.
- Pacchetto SQL generato: 488 profili, 9 colture, 28 esclusioni; stato
  `prepared-not-applied`. Nessun calcolo automatico abilitato.
- **73 test superati** con
  `uv run --frozen python -m unittest discover -s scripts/agronomy -p 'test_*.py' -v`.
  Sono inclusi 16 test della preparazione persistente, oltre ai controlli delle
  procedure agronomiche preesistenti.
- Parser PostgreSQL/PL/pgSQL offline: schema, apply, verify e rollback, sia con
  fixture sintetiche sia con i payload reali della selezione.
- `git diff --check`: superato.

Il parser prova la sintassi, non i privilegi o il comportamento del server
gestito. Non sono stati eseguiti schema, importazione, ripetizione o rollback su
Supabase; non è attestata idempotenza eseguita sul target. Nessun dato cliente,
account o storico è stato letto o modificato. Non sono stati cambiati Clerk,
Secrets, connessioni o percorsi d'avvio/post-merge.

Il successivo collaudo autorizzato deve verificare sul target la compatibilità
dei metadati e delle autorizzazioni, l'assenza di effetti collaterali e
l'idempotenza effettiva prima di considerare il catalogo applicato.
