---
name: Fixture nei collaudi browser isolati
description: Trasferire fixture sintetiche senza indebolire i blocchi di rete quando il runner browser non importa moduli Node locali.
---

Il runner browser può non riuscire a importare un helper Node dal workspace. In quel caso trasferire i soli payload sintetici tramite una risorsa statica di sviluppo, anziché allentare i blocchi API o ripetere l'intero collaudo.

**Why:** Un collaudo degli import GIS si è fermato al caricamento dell'helper, pur potendo proseguire con buffer sintetici forniti separatamente. Il blocco delle chiamate di rete nella pagina impediva intenzionalmente anche un normale fetch dei payload.

**How to apply:** Preparare i payload in un percorso generato ignorato da Git e leggerli tramite il contesto richieste del runner, non tramite il fetch bloccato della pagina. Continuare soltanto i controlli mancanti nello stesso tester. Mantenere vietati accessi alle API, credenziali, dati reali e riavvii del backend.

Per verificare il packaging GIS, usare un'entry sintetica separata con la vera
configurazione di produzione, servendo soltanto i file compilati senza fallback.
Non abilitare artificialmente `DEV` nella build di collaudo.

**Why:** Il server di sviluppo può risolvere import che invece mancano nella
distribuzione compilata; un fallback HTML può mascherare un chunk mancante.
Il collaudo non deve introdurre un accesso senza autenticazione nell'app reale.

**How to apply:** Provare anche un prefisso non-root, seguire i nomi dei chunk
effettivamente emessi anziché supporre il nome del pacchetto, e confermare che
la build normale escluda entry e dati sintetici.
