# Cancellazione rilievi entro 24 ore

## Aggiornamento applicativo, senza migrazione SQL

La funzione usa le colonne esistenti `owner_id`, `observation_id` e `created_at`.
Non richiede nuove tabelle, policy, ruoli, privilegi o modifiche a DATABASE_URL.
La connessione runtime Supabase conserva i privilegi già assegnati.

La protezione è nel DELETE del backend Express, non soltanto nel pulsante:

- proprietario uguale all'account autenticato;
- creazione non nulla e non futura;
- creazione compresa tra l'ora del server meno 24 ore e l'ora del server;
- stessa restrizione per la cancellazione singola e massiva;
- nessuna eccezione automatica per gli amministratori;
- solo gli ID effettivamente eliminati dal server vengono rimossi dalla UI.

Il vecchio reset completo del registro diventa cancellazione dei soli rilievi
recenti. Lo storico precedente resta presente. I record legacy senza ora di
creazione verificabile restano protetti. Conferma esplicita prima di cancellare;
errore del server significa conservare la riga nella UI.
Le mappe derivate dai rilievi vengono invalidate quando l'insieme cambia.
Le quote annuali consumate non vengono restituite dalla cancellazione.
Le procedure di cancellazione privacy restano separate e invariate.

Frontend e backend devono essere pubblicati insieme mediante il normale
Republish. Commit/push non attivano da soli la nuova funzione sul sito.
Non eseguire DDL al build o all'avvio e non copiare i dati di sviluppo su Supabase.

Le cancellazioni puntuali amministrative di dati storici richiedono una
richiesta esplicita separata: non costituiscono una deroga permanente alla regola.

## Registro condiviso tra dispositivi

Registro, storico, esportazioni e punti delle mappe ricevono la stessa lista
di osservazioni dell'account autenticato. La lista viene riletta all'apertura,
al ritorno alla pagina e ogni 30 secondi mentre la pagina è visibile.
Dopo un salvataggio o una cancellazione si rilegge il dato dal server.
Un errore di aggiornamento non svuota i dati già visibili e viene segnalato.
Le letture precedenti vengono invalidate durante le scritture per evitare
che una risposta vecchia ripristini una riga eliminata o nasconda un nuovo rilievo.
Le risposte identiche non invalidano inutilmente le mappe.

La sincronizzazione riguarda lo stesso account sullo stesso sito pubblico.
Preview e produzione restano intenzionalmente separate. Non duplicare record
già presenti su Supabase per farli comparire nello storico e non trasferire
dati reali nello sviluppo ordinario.

## Verifiche riproducibili

- Frontend: `pnpm --filter @workspace/ndvi-tabacco exec tsx --test src/utils/observationDeletion.test.ts src/i18n/runtime.test.ts`
- Backend: `pnpm --filter @workspace/api-server run test`
- Browser: pagina solo sviluppo `/tests/observation-deletion.html?module=history`,
  componenti reali con risposte sintetiche in memoria e nessun accesso alle API.
  Non è una prova di persistenza o di cancellazione di dati reali.
