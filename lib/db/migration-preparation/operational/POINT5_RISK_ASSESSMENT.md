# Valutazione conclusiva delle sei criticità residue

Variante accettata dal titolare: punto 5 concluso con limitazioni documentate.
Nessuna revoca globale. Accesso SQL dello sviluppo rinviato; readonly resta
NOLOGIN e non deve essere assumibile da credenziali di sviluppo. Runtime
riservato al backend; credenziali amministrative/migrator escluse dall'uso
ordinario di sviluppo. Nessun nuovo intervento SQL eseguito per l'accettazione.

Basata sul collaudo già eseguito. Nessuna nuova connessione, nessun test
ripetuto, nessuna correzione applicata. Il risultato tecnico del runner resta
invariato: protezioni applicative superate, isolamento globale non superato.

## Criterio

Distinguere il trasferimento dei dati e l'esercizio del backend fidato
dall'attivazione di un accesso SQL di sviluppo garantito readonly.
Una capacità di creare nuovi oggetti ausiliari non conferisce privilegi
sulle cinque tabelle applicative. Resta un rischio di consumo risorse;
TEMP introduce inoltre il possibile shadowing di relazioni non qualificate
nella stessa sessione, non un aggiramento delle ACL di public.

| Ruolo / operazione | Rischio per le cinque tabelle | Verdetto e correzione minima |
|---|---|---|
| app_runtime / CREATE TEMP TABLE | Nessuna nuova autorizzazione sulle tabelle public. Consumo risorse e shadowing nella sessione se SQL non qualificato. | NON BLOCCANTE. Nessuna revoca globale necessaria alla migrazione; SQL con schema esplicito e connessioni riservate al backend. |
| app_readonly / CREATE TEMP TABLE | Non permette scritture nelle tabelle public né crea nuovi dati applicativi persistenti. Rischi di risorse/shadowing della propria sessione. | NON BLOCCANTE per integrità dei dati persistenti. Non qualificare il ruolo come incapace di qualsiasi scrittura temporanea. |
| app_runtime / lo_create(0) | Crea un nuovo large object PostgreSQL, non sovrascrive le tabelle né oggetti altrui senza relativi privilegi. Potenziale consumo persistente di spazio. | NON BLOCCANTE per il backend fidato. Non esporre credenziali/SQL arbitrario agli utenti; nessun uso di large object richiesto dalle cinque tabelle. |
| app_runtime / lo_from_bytea(0, bytea) | Come sopra, con memorizzazione di byte nel nuovo oggetto. Possibile abuso di spazio, non bypass RLS. | NON BLOCCANTE alle medesime condizioni del backend; nessuna revoca globale indispensabile per trasferire i dati. |
| app_readonly / lo_create(0) | Non modifica le cinque tabelle, ma permette la creazione di oggetti ausiliari persistenti con una transazione READ WRITE confermata. | BLOCCANTE per attivare accesso SQL di sviluppo garantito privo di scritture persistenti. Non blocca backup/import se tale accesso rimane escluso. |
| app_readonly / lo_from_bytea(0, bytea) | Non modifica le cinque tabelle, ma consente scritture persistenti di byte e consumo di spazio. | BLOCCANTE per la stessa garanzia readonly; non per il trasferimento con ruolo readonly non utilizzabile dallo sviluppo. |

Il default transaction_read_only non è una barriera autorizzativa: non
impedisce al client di richiedere una transazione READ WRITE. Non usarlo come
correzione dei due problemi large object di app_readonly.

## Impatto delle correzioni SQL globali

Per entrambe le criticità TEMP, una revoca TEMP a PUBLIC potrebbe interferire
con processi o routine che usano tabelle temporanee. Non è necessaria per
proteggere le cinque tabelle. Schemi espliciti evitano lo shadowing senza
modificare ruoli gestiti. I percorsi applicativi esaminati usano anche nomi
non qualificati: non dichiarare questo irrobustimento già applicato.

Per tutte e quattro le criticità large object, una revoca EXECUTE a PUBLIC
sulle routine integrate può interessare utilizzatori diversi dai ruoli
applicativi. Proprietari, ACL e impatto sui servizi gestiti non sono stati
verificati ulteriormente: nessuna promessa di revoca sicura o eseguibile.
Revocare al solo ruolo non elimina un privilegio ancora ereditato da PUBLIC.
Bloccare solo le due funzioni provate non certifica l'assenza di altre
interfacce di scrittura large object.

## Variante circoscritta accettata; niente nuove modifiche SQL implicite

È possibile separare la migrazione dei dati dall'attivazione SQL dello
sviluppo, senza creare altri database o toccare privilegi gestiti:

1. Non attivare app_readonly per lo sviluppo: NOLOGIN e nessuna membership
   SET/INHERIT/delega a un principal di sviluppo. NOLOGIN da solo non basta.
2. Non rendere disponibili nello sviluppo ordinario credenziali runtime,
   migrator o amministrative; l'attuale credenziale QA amministrativa non è
   compatibile con questa separazione una volta importati dati reali.
   Qualsiasi rimozione/ricollocazione richiede approvazione distinta.
3. Riservare il futuro accesso runtime al backend, senza distribuzione ai
   browser/utenti o servizi che accettino SQL arbitrario.
4. Lasciare invariati privilegi provider, PUBLIC e le protezioni collaudate;
   mantenere colonne e schemi espliciti nei percorsi di trasferimento.
5. Proseguire con backup/import soltanto dopo autorizzazioni specifiche.
   Lo sviluppo resta temporaneamente senza accesso SQL al database produttivo
   finché la garanzia readonly non è risolta.

Questa variante cambia temporaneamente il piano di accesso allo sviluppo:
ha ricevuto accettazione esplicita e non equivale al completamento della
protezione globale readonly. Separazione delle credenziali da finalizzare
prima dell'uso ordinario del target, con le autorizzazioni necessarie.
Non modificare i gate dei runner per far apparire superati i sei finding.

Conclusione: quattro criticità NON BLOCCANTI; due BLOCCANTI per l'attivazione
SQL readonly prevista dal piano completo. Nessuna delle sei obbliga di per sé
a rinunciare al trasferimento dei dati con sviluppo SQL escluso e backend
fidato. Nessuna autorizzazione al punto successivo è implicita nel rapporto.
