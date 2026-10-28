---
name: Accesso riservato e isolamento dei clienti
description: Decisioni di prodotto sull’autorizzazione amministrativa e sulla riservatezza dei rilievi.
---

L’accesso alla soluzione è riservato agli utenti autorizzati dall’amministratore; ogni utente vede soltanto i propri dati.

**Why:** l’utente ha confermato esplicitamente l’isolamento dei dati, non un registro condiviso tra clienti.

**How to apply:** non introdurre registrazione applicativa libera, elenchi di rilievi condivisi o visibilità trasversale implicita. La gestione amministrativa degli account non attribuisce automaticamente accesso ai rilievi degli altri utenti.

I rilievi precedenti all’introduzione degli account appartengono all’amministratore iniziale e non sono dati dimostrativi condivisi.

**Why:** preservare il lavoro esistente senza esporlo ai nuovi clienti.

**How to apply:** importazioni, ripristini e migrazioni devono mantenere questa attribuzione; non distribuire il registro storico agli utenti invitati.

La durata dell’abbonamento è gestita solo dall’amministratore; l’utente deve vedere la propria scadenza e i giorni residui.

**Why:** richiesta esplicita dell’utente di controllare la durata nella gestione amministrativa e mostrarla nell’app.

**How to apply:** non consentire rinnovi autonomi attraverso campi client. La scadenza sospende l’utilizzo operativo senza cancellare i rilievi o impedire l’esportazione personale e le richieste privacy. Il conteggio è gestione manuale degli accessi, non un’integrazione di pagamento.

La pagina iniziale deve dare subito accesso al modulo di autenticazione, non presentare una pagina promozionale prima dell’accesso. Privacy, recupero e cambio password devono restare disponibili.

**Why:** l’utente ha chiesto esplicitamente di sostituire la pagina iniziale informativa con l’accesso diretto.

**How to apply:** mantenere solo il contesto essenziale sul prodotto e sugli accessi riservati; non reintrodurre un passaggio promozionale obbligatorio. Il contatto di assistenza password non implica che sia anche il mittente delle email automatiche.

Un modulo Clerk incorporato nella home pubblica non deve usare `/` come prefisso di autenticazione con routing per percorso.

**Why:** quel prefisso può interpretare anche `/privacy` come passaggio di accesso e rimandare al login, rendendo l’informativa inaccessibile.

**How to apply:** isolare i passaggi del modulo incorporato dal router delle pagine pubbliche; preservare invece il routing per percorso nelle pagine dedicate `/sign-in` e `/sign-up`. Verificare la navigazione reale alla privacy oltre al semplice caricamento del modulo.

Per l’informativa l’utente ha dichiarato sede legale a Milano, conservazione di 5 anni per ciascuna categoria, accordi con i responsabili ai sensi dell’art. 28 GDPR e nessun trasferimento extra UE.

**Why:** sono informazioni fornite dal titolare, non esiti di una verifica tecnica o contrattuale dei fornitori.

**How to apply:** mantenere distinti la politica dichiarata, la verifica di contratti/subfornitori e l’applicazione operativa della conservazione. Non attestare localizzazione UE o cancellazione automatica solo perché sono descritte nell’informativa.

L’utente specifica che l’applicazione è sviluppata interamente in Italia.

**Why:** chiarimento esplicito dell’utente sul contesto del prodotto.

**How to apply:** distinguere il luogo di sviluppo dalla localizzazione del trattamento. Il primo non dimostra da solo dove hosting, autenticazione e cartografia trattano i dati.
