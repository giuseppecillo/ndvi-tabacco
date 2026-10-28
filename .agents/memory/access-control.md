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

Per l’informativa l’utente ha confermato conservazione di 5 anni per ogni categoria dalla creazione dell’account da parte dell’amministratore, con scadenza unica anche per i dati aggiunti successivamente. Ha confermato basi giuridiche distinte: contratto per il servizio, legittimo interesse per sicurezza, obbligo legale per le richieste privacy.

**Why:** il titolare ha confermato esplicitamente la decorrenza unica, dopo averne chiarito l’effetto sui dati aggiunti più tardi.

**How to apply:** non sostituire la decorrenza con la data del singolo rilievo. Distinguere la politica dichiarata dall’effettiva applicazione operativa; non introdurre cancellazioni massive senza verificarne tutte le conseguenze.

Taurus Agriculture Solution SRL ha sviluppato e gestisce NitroCrop NDVI, è il fornitore della soluzione e il titolare del trattamento. Il titolare ha confermato contratti gestiti e controfirmati con Aruba, Replit, Supabase e Netlify, comprensivi degli accordi privacy richiesti dal GDPR; hosting nel Regno Unito; backup incrementali continui cifrati in transito e a riposo, eliminati entro 24 ore dalla cancellazione dei dati.

**Why:** il titolare ha fornito questi chiarimenti espliciti, distinguendo la gestione del servizio dalle condizioni dei servizi tecnici.

**How to apply:** riportare queste informazioni come conferme del titolare, non come risultati di audit indipendenti. Non dichiarare trattamento esclusivo UE o assenza di trasferimenti. Non confondere il termine di 24 ore dalla cancellazione con una conservazione di 24 ore dalla creazione della copia.

L’utente specifica che l’applicazione è sviluppata interamente in Italia.

**Why:** chiarimento esplicito dell’utente sul contesto del prodotto.

**How to apply:** distinguere il luogo di sviluppo dalla localizzazione del trattamento. Il primo non dimostra da solo dove hosting, autenticazione e cartografia trattano i dati.
