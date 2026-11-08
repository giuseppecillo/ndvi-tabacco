---
name: Criteri agronomici del pomodoro
description: Scelte del titolare sui riferimenti NDVI e sui profili omonimi del catalogo pomodoro.
---

Per il pomodoro il titolare ha scelto: «quando trovi un range è considerare la media».
Usare quindi la media aritmetica dei due estremi dell'intervallo NDVI della fase.

**Why:** scelta esplicita del titolare; il file fornisce intervalli, non singole soglie NDVI validate.

**How to apply:** mantenere questo criterio nel calcolo visibile e nella validazione API; non sostituirlo implicitamente con il limite inferiore o una curva di altre colture.

Per i profili omonimi, il titolare vuole conservare Roma VF per industria, pelato e polpa, e Gardener's Delight come ciliegino, escludendo gli altri due profili.

**Why:** il titolare ha chiesto di eliminare i record omonimi e ha scelto esplicitamente quali mantenere.

**How to apply:** rispettare queste esclusioni anche nei futuri aggiornamenti dal CSV originale; non deduplicare arbitrariamente altri nomi simili né cancellare rilievi già salvati.
