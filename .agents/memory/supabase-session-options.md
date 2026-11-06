---
name: Opzioni di sessione Supabase
description: Non presumere che le opzioni di startup impostino il default read-only sul Session pooler.
---

Sul Session pooler autorizzato, il default read-only richiesto nel pacchetto di
avvio non risultava attivo: una diagnosi in transazione esplicita READ ONLY ha
misurato transaction_read_only=on e default_transaction_read_only=off, con
identità postgres coerenti. La causa lato pooler/server non è stata accertata.

**Why:** i valori richiesti dal client non equivalgono a impostazioni effettive
del server. TLS valido e identità corretta non provano il default di sessione;
il default non misura a sua volta lo stato della transazione corrente.

**How to apply:** misurare separatamente entrambi i valori. Per un inventario
autorizzato in lettura usare transazioni esplicite e verificare lo stato
effettivo, senza dedurre che il ruolo amministrativo sia readonly. Non cambiare
ruoli, server, metodo di connessione o criteri di blocco senza consenso.
Non estendere questa osservazione automaticamente ad altri ruoli o endpoint.
