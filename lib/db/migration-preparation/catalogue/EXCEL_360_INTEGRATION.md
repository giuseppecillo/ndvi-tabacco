# Catalogo operativo: Excel 360 varietà

## Ambito autorizzato

Il titolare richiede l'integrazione nei calcoli delle 360 varietà dell'Excel e,
dopo l'integrazione, la tabella dedicata sul solo Supabase Agri Precision.
Questa autorizzazione riguarda il catalogo agronomico, **non** la distinta
tabella dei piani utenti, né Publish, account, credenziali o connessioni.

La baseline di 488 profili resta immutata. Si aggiungono 60 profili ciascuno
per Aglio, Cipolla, Olivo, Zucchino, Melanzana e Ciliegio: 848 profili nel
modello a quattro fasi. I 14 profili grano duro, 525 pomodoro e 9 tabacco
mantengono i rispettivi modelli specializzati. Totale persistibile: **1.396
profili in 18 colture**, con identità originali, anche composite, preservate.

## Conversione e verifica

`scripts/agronomy/import_excel_catalogue.py` verifica l'SHA-256 dell'originale,
360 righe, 60 per coltura, assenza di omonimi nella stessa coltura, numeri
finiti, N totale/somma delle fasi, NDVI, BBCH e completezza. Nessun parametro
di calcolo manca: non sono necessarie varietà affini.
Il file resta una fonte fornita dal titolare, non una certificazione sperimentale.
Fosforo, potassio, acqua e note sono esclusi come richiesto.
Le sole normalizzazioni sono BBCH a due cifre, precisione numerica significativa
di Excel e nomi delle fasi coerenti con la coltura (bulbo, non fioritura, per
aglio/cipolla). Gli intervalli NDVI continuano a usare la media aritmetica.

Le sei colture usano lo stesso componente grafico già presente per kiwi e
le altre colture del catalogo: dettaglio varietale, resa, densità, N totale,
quote/BBCH/NDVI di fase e dose puntuale. Richiedono conferma della fase in campo,
non un'età fenologica inventata. Dose proporzionale al deficit NDVI, zero a
target/sopra target e nelle fasi N=0, limitata al residuo del piano.
La validazione API ricalcola gli stessi valori prima del salvataggio.
I dati originali delle osservazioni non vengono ricalcolati o riscritti.

## Tabella dedicata

`agronomy_catalogue.model_profiles` contiene versione, coltura, varietà,
tipo di modello, tutti i parametri e SHA-256 del record. La chiave è
versione/coltura/varietà, senza FK o dipendenze da dati cliente.
Le versioni precedenti non vengono aggiornate o cancellate.

`models-schema.sql` è utilizzato soltanto dallo strumento manuale
`artifacts/api-server/src/tools/apply-catalogue.ts`, mai dall'app o post-merge.
Questo strumento è escluso dal progetto TypeScript dell'API e viene
controllato separatamente con tsc e compilato con esbuild.
Unico Secret ammesso: SUPABASE_QA_ADMIN_URL, letto internamente senza stampa.
Endpoint/progetto/database/ruolo/TLS/CA/hostname sono vincolati alle protezioni
già verificate. Non legge DATABASE_URL e non si collega a Replit.

Una sola transazione con timeout e lock del catalogo; controllo strutturale,
ACL, RLS e confronto completo di ogni record prima del COMMIT. Errori:
ROLLBACK e arresto, senza correzioni automatiche di oggetti inattesi.
Runtime: solo SELECT; ruoli Data API senza accesso; nessuna modifica a
LOGIN, membership, privilegi globali o alle cinque tabelle applicative.
RLS forzata con policy dedicate a runtime, readonly, migrator e amministratore.

La Preview Replit usa la fonte compilata per mantenere lo sviluppo separato.
Su backend Supabase la nuova release API verifica l'intero catalogo persistito
rispetto alla versione compilata prima di servire il catalogo o salvare
osservazioni dei modelli a quattro fasi. Mancanza/divergenza: errore esplicito,
non fallback silenzioso. La pubblicazione resta manuale e separata.

Esito dell'applicazione, se eseguita con successo:
`generated-artifacts/catalogue-360-result.json` (conteggi, versione, controlli,
senza dati cliente o credenziali). La presenza dello script non attesta da sola
un'applicazione: verificare quel rapporto e il risultato dell'esecuzione.
