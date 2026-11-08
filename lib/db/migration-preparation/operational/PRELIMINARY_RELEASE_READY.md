# Release preliminare pronta per pubblicazione manuale

Data: 2026-11-08. Destinazione futura unica: Supabase Agri Precision.
Baseline Git prima degli interventi:
`efbc6b395c836535b9a060113cf899b8a5f0838c`.

## Stato e perimetro

Il titolare ha autorizzato la fase preliminare. La pubblicazione deve essere
avviata dal titolare; NON è stata avviata dall'agente.
L'applicazione rimane collegata al database Replit. Nessun trasferimento,
backup finale, modifica DATABASE_URL, manutenzione o intervento sul logging.

Configurazione Production non segreta impostata tramite setEnvVars:

| Parametro | Valore |
| --- | --- |
| NITROCROP_DB_BACKEND | replit |
| NITROCROP_MIGRATION_PAUSE | 0 |
| NITROCROP_RUNTIME_PREFLIGHT | 1 |

Queste impostazioni devono risultare nella configurazione effettiva della
nuova pubblicazione. Non alterare il Secret runtime inserito dal titolare
nei Deployment secrets. Il suo valore non è stato richiesto, letto o copiato.
Non creare copie QA o in sviluppo per ottenere un risultato anticipato.

## Codice collegato

- `lib/db/src/index.ts`: factory connessione; default identico al precedente
  collegamento Replit. Esporta i controlli di identità e preflight.
- `lib/db/src/production-runtime-preflight.ts`: solo con flag 1,
  NODE_ENV=production e REPLIT_DEPLOYMENT=1; backend applicativo ancora
  replit. Pool Supabase separato, con URL runtime e CA ufficiale.
- `lib/db/src/runtime-identity.ts`: controllo TLS e hostname, transazione
  REPEATABLE READ READ ONLY, probe prima della SELECT di identità,
  verifica del solo ruolo corrente app_runtime, ROLLBACK e rilascio.
- `artifacts/api-server/src/index.ts`: preflight prima dell'ascolto HTTP
  e verifica schema applicativo in sola lettura. Nessun bootstrap/riparazione.
  Errori del driver non vengono registrati né propagati con credenziali.
- `artifacts/api-server/src/app.ts`: middleware manutenzione dopo Clerk,
  prima dei router; default e configurazione preliminare disattivati.
- Trasformazioni preparatorie rese idempotenti e test offline aggiornati.

## Risultati già ottenuti

- Test offline release: 18/18.
- Test offline sicurezza avvio/post-merge: 3/3.
- TypeScript librerie e API: superato.
- Compilazione API: superata.
- Riavvio unico del workflow API di sviluppo: completato.
- Log sviluppo: preflight Supabase `disabled`; verifica read-only dello
  schema superata, server avviato.
- GET /api/healthz attraverso proxy: HTTP 200, {"status":"ok"}.
- Pagina pubblica di accesso in preview: renderizzata, nessun errore bloccante.
- Nessuna ripetizione dei 95 precedenti test SQL su Supabase.

**Non è ancora un risultato positivo del login reale a Supabase.**
La disponibilità del Secret nella release e la password sono provate soltanto
quando il preflight Production autentica davvero la connessione.

## Prossima azione: pubblicazione preliminare

1. In Publishing verificare il Secret runtime già inserito e i tre
   parametri non segreti sopra indicati. Non mostrare il valore del Secret.
2. Esaminare l'eventuale proposta di sincronizzazione schema: deve essere
   assente/vuota. Se contiene SQL o richiede modifiche database, fermarsi;
   non autorizzare né forzare la sincronizzazione.
3. Solo in assenza di modifiche database, il titolare avvia Publish.
4. Verificare i log della NUOVA revisione, non quelli della vecchia servita:
   messaggio `Supabase Production READ ONLY preflight` con status `passed`,
   seguito dalla verifica read-only dello schema e dall'avvio del server.
   `disabled`, errore o soli log di una vecchia revisione NON bastano.
5. Se il preflight fallisce, il nuovo processo non apre l'API. Non cambiare
   backend, disabilitare TLS o saltare il controllo per dichiarare successo.
6. Dopo esito positivo, preparazione al fermo scritture/backup finale e
   trasferimento secondo la checklist già approvata, con le rispettive
   autorizzazioni specifiche. Nessun passaggio automatico.

## Ritorno e passaggio finale

Per un ritorno a Replit non usare una vecchia release con bootstrap dello
schema non attestato: usare il codice verificato con backend replit.
Se Supabase non è disponibile, disattivare il SOLO preflight tramite
NITROCROP_RUNTIME_PREFLIGHT=0 richiede consenso operativo e nuova
pubblicazione; non rappresenta un collaudo riuscito.

Nel futuro cutover autorizzato a Supabase, impostare
NITROCROP_RUNTIME_PREFLIGHT=0: la verifica di identità dell'effettivo pool
applicativo Supabase resta attiva, mentre il diagnostico separato preliminare
richiede intenzionalmente backend replit. Nessun parametro viene cambiato
automaticamente dal codice.
