# Backup reale Production — creato e verificato

Data: 7 novembre 2026. Il titolare ha confermato l'associazione della connessione
Production al deployment pubblicato e autorizzato esplicitamente sia il backup
reale sia la nuova coppia age. Successivamente il titolare ha confermato:
«ho scaricato i file». La ricezione della copia esterna è quindi confermata
dal titolare; destinazione esatta e modalità di custodia non sono state
verificate tecnicamente. Nessun caricamento esterno è stato eseguito dall'Agent.

## Esito

- Origine: primario già verificato, progetto/ramo Production attesi.
- TLS: verifica della catena CA e dell'hostname mantenuta sia nella diagnosi
  sia in pg_dump (`verify-full`, CA pubbliche attendibili del sistema).
- Dump logico completo PostgreSQL custom, compresso e cifrato age in streaming.
- Nessun archivio con dati reali in chiaro scritto sul filesystem.
- Archivio cifrato: **16.127 byte**.
- SHA-256: `3c565b60b8a2e1e1ddf29b7105e8b42fa1f6b7871e6cc05c98c0936e788aab38`.
- Verificato il checksum dell'effettivo file su disco.
- Decifratura autenticata riuscita con la nuova identità age.
- Parsing/decompressione integrale con pg_restore verso /dev/null riusciti,
  senza connessione a un database.
- Controllata la presenza di TABLE e TABLE DATA per tutte le cinque tabelle:
  app_users, security_state, privacy_requests, security_events, osservazioni.
- File 0600 e directory 0700 verificati.
- Output esclusi da Git e dalla pubblicazione.

Il backup copre il database, non i ruoli/password globali del cluster né i
Secret Replit. Gli account presso Clerk non sono esportati da pg_dump;
gli identificativi Clerk contenuti nelle tabelle applicative sono nel dump.
Non è stato eseguito né certificato un ripristino SQL.

## File riservati da consegnare al titolare

Cartella archivio:

`generated-artifacts/production-backup/2026-11-07T11-36-41.411Z-ECpI9p/`

- `database.dump.age`: archivio cifrato.
- `checksum.json`: hash, identità sorgente e risultati delle verifiche.

Cartella chiave separata:

`generated-artifacts/backup-keys/owner-BRKOw7/`

- `private-key.txt`: **chiave privata, non aprire o incollare in chat**.
- `public-recipient.txt`: destinatario pubblico.

La chiave privata non è stata mostrata nei log o inviata tramite Library/link
pubblici. È custodita temporaneamente su Replit, come autorizzato: non si
afferma che non sia mai stata presente presso il fornitore.

Per la consegna: nell'albero dei file Replit fare clic destro sul singolo
file e scegliere Download. Il titolare deve conservare archivio e checksum
in una destinazione riservata esterna a Replit e la chiave separatamente.
Non sono richieste installazioni sul PC.

## Cosa non è stato fatto

- Nessuna modifica a schema o dati sorgente; nessun congelamento delle scritture.
- Nessuna connessione o scrittura Supabase, nessun nuovo database/progetto.
- Nessuna importazione o confronto dei dati su un target.
- Nessuna modifica a DATABASE_URL, Clerk, configurazione Publish o applicazione.
- Nessuna pubblicazione, commit/push o eliminazione di Secret/chiavi/archivi.

Il dump fotografa uno snapshot coerente del momento dell'esportazione.
Le scritture applicative successive non sono comprese: prima del trasferimento
definitivo serviranno autorizzazioni distinte per congelamento e snapshot finale.

## Azioni ancora necessarie

1. Download dei file confermato dal titolare. Archivio e chiave devono restare
   custoditi separatamente; nessuna verifica indipendente della custodia.
2. Qualsiasi rimozione locale del Secret o della chiave richiede conferma separata;
   non garantire cancellazione fisica dalle copie del fornitore.
3. Attendere nuova autorizzazione specifica prima di creare ruoli/tabelle/RLS
   sul solo progetto Supabase Agri Precision. Import e cambio connessione
   restano successivi e separati.
