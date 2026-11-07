# Identità sorgente Production — verifica conclusa, nessuna esportazione

Data: 7 novembre 2026. Credenziale letta esclusivamente dal programma tramite
il Secret temporaneo `REPLIT_PROD_BACKUP_URL`; nessun valore della credenziale
stampato, salvato nel rapporto o passato nella riga di comando.

## Risultato live

| Proprietà | Esito |
|---|---|
| Endpoint diretto verificato | ep-spring-dew-apyfd6xi.c-7.us-east-1.aws.neon.tech |
| Database | neondb |
| Progetto provider | late-darkness-39148782 |
| Ramo provider | br-winter-salad-apdld73l |
| Ruolo | neondb_owner |
| Primario | sì, pg_is_in_recovery=false |
| Transazione | REPEATABLE READ READ ONLY, probe transaction_read_only=on |
| Trasporto effettivo del client | TLSv1.3, encrypted=true, authorized=true |
| Verifica hostname del certificato | superata esplicitamente |
| Verifica catena CA | mantenuta attiva, rejectUnauthorized=true |
| Versione server | major 16 |
| Chiusura | ROLLBACK completato e client chiuso prima del rapporto |
| Dati applicativi letti | nessuno |
| Dump, DDL/DML, Supabase, DATABASE_URL | nessuna operazione |

Progetto, ramo e database coincidono con quelli precedentemente identificati
tramite il canale Production Replit; questa volta il collegamento è al primario,
non alla replica di lettura. L'endpoint non è stato derivato modificando un
hostname pooler: proviene dalla connessione fornita dal titolare.

La configurazione privata del processo pubblicato non è stata letta.
Prima dell'esportazione il titolare deve confermare che la connessione fornita
è quella Production associata al deployment pubblicato, non un override diverso.
Il programma non deduce questo legame dal solo nome neondb.

## Diagnosi TLS e correzione del controllo

I primi tentativi sono stati bloccati senza esportazione perché pg_stat_ssl
riporta ssl=false sulla connessione vista dal backend PostgreSQL.
Neon interpone un proxy: quel dato non certifica il trasporto client→endpoint.
Non è stato disabilitato TLS e non è stato modificato alcun parametro server.

Il controllo ora richiede, PRIMA di qualsiasi SQL:

- socket client effettivamente cifrato;
- autorizzazione della catena del certificato senza errori;
- certificato presente e hostname verificato con tls.checkServerIdentity;
- protocollo TLSv1.2 o TLSv1.3.

pg_stat_ssl rimane nel rapporto come diagnostica del collegamento backend,
non come sostituto delle verifiche reali sul socket. Non si certifica la
cifratura del tratto interno proxy→PostgreSQL.

Il test di regressione accetta backend ssl=false SOLO con trasporto client
verificato. Altri test rifiutano socket non cifrato, certificato non autorizzato,
errore di autorizzazione, hostname diverso e protocollo obsoleto prima di SQL,
anche se il backend dichiara ssl=true.

Riferimento provider: https://neon.com/docs/security/security-overview

## Collaudo e perimetro

30 test puri della guardia superati, nessun nuovo database o cluster creato.
Sono stati mantenuti i vincoli su endpoint, progetto, ramo, ruolo e primario.
Nessuna lettura di app_users, osservazioni, Auth o Storage e nessun uso del
Secret Supabase. Nessun file con dati reali o chiavi di cifratura è stato creato.

Il Secret temporaneo resta presente: rimozione soltanto dopo autorizzazione
del titolare. Non rigenerare la password della connessione originale.

## Prossima autorizzazione necessaria

Confermare associazione Production/deployment, autorizzare il backup reale
cifrato e la modalità della chiave/consegna. Nessuna scrittura su Supabase,
blocco delle scritture, pubblicazione o modifica DATABASE_URL consegue
automaticamente a questa verifica.
