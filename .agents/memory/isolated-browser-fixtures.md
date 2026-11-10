---
name: Fixture nei collaudi browser isolati
description: Trasferire fixture sintetiche senza indebolire i blocchi di rete quando il runner browser non importa moduli Node locali.
---

Per provare una risposta obsoleta dopo una cancellazione, lasciare che il
trasporto sintetico completi il vecchio GET anche dopo l'annullamento.

**Why:** se la fixture rispetta soltanto AbortSignal, una prova positiva può
dimostrare esclusivamente l'annullamento e non la protezione dell'interfaccia
contro una risposta già in arrivo.

**How to apply:** condividere lo stato inventato tra contesti nel runner,
trattenere uno snapshot precedente alla mutazione e rilasciarlo dopo il suo
aggiornamento successivo, senza aprire accessi alle API reali.

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

Nei collaudi che montano direttamente componenti serviti da Vite, riusare gli
URL esatti dei moduli di stato risolti dal componente, comprese le query HMR.
Caricare anche gli stili normalmente forniti dal contenitore applicativo.

**Why:** importare separatamente il modulo delle lingue senza la query HMR
ha creato un secondo store: le funzioni traducevano ma l'interfaccia ascoltava
lo store originale. Gli stili mancanti hanno inoltre falsato la resa mobile.

**How to apply:** prima di diagnosticare un difetto confrontare gli import
effettivi e gli stili della fixture con quelli dell'app. Se la fixture usa
un preambolo HMR semplificato, ricaricare il documento dopo le modifiche:
una vista rimasta montata può mostrare ancora le vecchie classi.

Nei runner Vite privati, la scoperta tardiva di dipendenze dei worker può
ricaricare il documento anche quando HMR è disabilitato.

**Why:** il parser XML del worker GIS è stato scoperto solo all'import del
confine, causando una riottimizzazione e un reload durante il percorso sintetico.

**How to apply:** preottimizzare le dipendenze scoperte in ritardo prima delle
interazioni; non mascherare i reload inattesi con retry dei salvataggi.

Quando un collaudo deve vietare tutte le API reali, simulare anche lo stato
di autenticazione nel solo contesto browser, senza completare un login esterno.
Non introdurre un accesso di prova nel codice dell'app.

**Why:** l'accesso programmatico del tester può richiedere uno scambio esterno
con Clerk, incompatibile con un collaudo che vieta esplicitamente ogni API reale.
Un adattatore statico della dipendenza nel browser mantiene il percorso reale
dei componenti, ma non verifica il funzionamento dell'autenticazione.

**How to apply:** dichiarare questo limite nel report; intercettare le dipendenze
prima della navigazione e mantenere API, scritture e WebSocket bloccati.

Nei collaudi multi-motore, il download del binario WebKit non garantisce che
si avvii nell'ambiente Nix. Non sostituire librerie con ABI diverse e non
equiparare WebKit Playwright a Safari distribuito da Apple.

**Why:** il MiniBrowser Ubuntu richiedeva librerie assenti; un percorso
globale alle librerie Nix ha introdotto incompatibilità anche per Node.
Una prova Firefox riuscita non dimostra la compatibilità Safari.

**How to apply:** verificare prima la disponibilità del motore, conservare
separatamente le evidenze e proseguire soltanto quello bloccato. Una variante
ufficiale Playwright per altra distribuzione Linux può essere compatibile con
i SONAME Nix disponibili. Limitare loader e librerie al browser, includendo
i processi figli e il modulo GIO TLS; le risoluzioni virtuali hwcaps viste
dalla shell non sono necessariamente disponibili ai processi avviati da Node.
Dichiarare esplicitamente la differenza fra WebKit e Safari reale.
