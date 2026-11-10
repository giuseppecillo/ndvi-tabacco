# Varietà proposte dagli utenti

## Flusso

1. Utente autorizzato: sceglie una coltura esistente, una varietà affine della
   stessa coltura, inserisce un nome nuovo e le quote N per tutte le fasi.
2. **Salva proposta** inserisce un record persistente `pending`. Il profilo
   contiene le quote inserite e uno snapshot dei restanti parametri di riferimento.
   Nessun contenuto viene approvato automaticamente, neppure se inserito da admin.
3. Amministrazione legge automaticamente la coda: nome, coltura, riferimento,
   data, quote N, totale e riferimenti NDVI di fase.
4. Solo la route amministrativa può approvare/rifiutare. La decisione è un UPDATE
   atomico condizionato a `status='pending'`, con revisore, data e nota.
5. L'approvazione rende quel record parte del catalogo condiviso nella stessa
   operazione: **non serve un agente AI né una seconda copia/importazione**.
   Le viste selezionano solo record approvati e si aggiornano al focus/ogni 30 s.
6. Catalogo, selezione nei parametri colturali e Excel includono i profili approvati.
   Le proposte rifiutate restano visibili al proponente con la nota.

## Dati e calcoli

- Archivio aggiuntivo: `agronomy_catalogue.variety_submissions`, distinto
  dalla release immutabile `model_profiles`; il catalogo originale resta intatto.
- Il totale N è la somma delle quote inserite, non un valore client separato.
- Il nome non può sostituire un profilo originale. Un indice impedisce due proposte
  attive con stesso nome/coltura; una proposta rifiutata può essere ripresentata.
- Nessuna modifica a utenti o osservazioni già salvate.
- Parametri mancanti: riferimento esplicito della stessa coltura, scelto dall'utente
  e verificabile dall'amministratore. Le quote N non certificano una curva NDVI.
- Per i profili nativi grano i riferimenti di fase sono ancoraggi operativi della
  curva esistente (giorni 0/50/136/190; RGT NATUR 0/136/190), non una curva
  sperimentale della nuova varietà. Il piano proposto usa la fase confermata.
- Il grano è normalizzato a t/ha nel nuovo profilo (resa originale q/ha / 10).
  Le varietà originali e i loro calcoli non sono modificati.
- Il backend rilegge il profilo approvato e ricalcola la dose dai cinque NDVI;
  non si fida di quote, dose o approvazione inviate dal browser.
- Le letture dello storico conservano i dati originali, senza ricalcolarli.

## Migrazione e sicurezza

SQL manuale: `variety-submissions.sql`. Supabase: applicazione esclusivamente
tramite `apply-variety-submissions.ts --apply-approved-variety-table`, con Secret
dedicato, progetto/host vincolati, CA/hostname TLS verificati, singola transazione,
timeout e verifica privilegi/RLS prima del COMMIT.

- Nuova tabella soltanto; nessun cambiamento ai default globali o ai ruoli.
- RLS forzata. Il backend ha SELECT/INSERT/UPDATE, non DELETE/TRUNCATE.
- Nessun privilegio della nuova tabella ad anon/authenticated/service_role.
- Isolamento account e decisioni amministrative sono controllati da Express:
  RLS distingue i ruoli PostgreSQL, non le identità Clerk del pool condiviso.
- app_readonly e app_migrator rimangono NOLOGIN; nessuna nuova credenziale.
- Niente DDL all'avvio/build/post-merge, niente modifiche a DATABASE_URL o Clerk.
- Il database di sviluppo ha la stessa nuova struttura, ma resta isolato.

Report applicazione: `generated-artifacts/variety-submissions-migration.json`,
ignorato da Git e pubblicazione.

## Verifica e rilascio

- `pnpm --filter @workspace/api-server run test:varieties`
- `pnpm --filter @workspace/api-server run test`
- `pnpm --filter @workspace/ndvi-tabacco run test`
- Fixture browser solo sviluppo: `/tests/variety-proposals.html`; API intercettate,
  dati sintetici in sessionStorage, nessun account o database reale.

Pubblicare normalmente solo dopo il collaudo. Commit/push non pubblicano.
Rollback applicativo: ripristinare la release precedente, lasciando la nuova
tabella protetta e i record conservati; nessun DROP o annullamento di dati.
La connessione degli altri moduli non è stata spostata da questa funzione.
