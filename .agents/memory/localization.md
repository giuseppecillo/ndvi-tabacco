---
name: Lingue e contatti di assistenza
description: Requisiti linguistici dell’intera soluzione e separazione dei contatti di supporto.
---

Pagina di accesso e applicazione devono essere disponibili in italiano, inglese e spagnolo, con cambio lingua. Il contatto tecnico è support@taurusagsolution.com; password e privacy restano canali distinti.

**Why:** richiesta esplicita dell’utente, estesa all’applicazione e non limitata al modulo di accesso.

**How to apply:** includere navigazione, account, amministrazione, consigli agronomici e mappe quando si aggiunge una nuova funzionalità. Conservare la preferenza di lingua senza azzerare il lavoro dell’utente.

La traduzione riguarda la visualizzazione: identificatori agronomici, valori delle opzioni, dati inseriti dai clienti, formule e payload delle API devono restare invariati.

**Why:** alcuni nomi italiani di coltura, varietà e fase sono anche identificatori del modello esistente. Tradurli nei dati provocherebbe regressioni di calcolo e salvataggio.

**How to apply:** usare il catalogo condiviso per il testo visualizzato e le localizzazioni native del gestore di autenticazione. Non usare mutazioni del DOM o traduzioni esterne dei dati dell’utente.
