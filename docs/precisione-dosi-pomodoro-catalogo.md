# Precisione delle dosi: pomodoro e colture del catalogo

## Regola per nuovi rilievi

La dose indicata/salvata è in decimi di kg N/ha. Il calcolo proporzionale NDVI
mantiene il precedente arrotondamento; residuo e quota di fase diventano limiti
in decimi arrotondati **per difetto**. La dose non supera mai né il residuo grezzo
né la quota grezza. Nessun epsilon aumenta questi limiti.

Esempi indipendenti, con deficit sufficiente e quota di fase non limitante:

| Residuo approssimativo | Nuova dose |
| --- | --- |
| 0,01 / 0,04 / 0,06 / 0,09 | 0,0 |
| 0,11 / 0,16 / 0,19 | 0,1 |
| 0,26 | 0,2 |

La sottrazione binaria resta vincolante: per esempio 250 − 249,9 è appena
inferiore a 0,1, quindi la dose è 0,0, non 0,1. La stessa precauzione vale
per quote di fase sotto il decimo dovute alla proporzione sulla resa.

`dose` e `quotaAzoto` nei POST devono coincidere esattamente con la dose
canonica ricalcolata, senza tolleranza numerica sulle dosi. Gli altri parametri
mantengono i loro controlli. Non cambia il contratto dei campi né lo schema dati.

## Inventario dei consumatori in `artifacts/ndvi-tabacco/src`

- `components/PomodoroParameters.tsx` e `components/CatalogueCropParameters.tsx`:
  risultati di calcolo e dose della coltura.
- `App.tsx`: salvataggio di `dose`/`quotaAzoto` direttamente dai modelli condivisi;
  tabella storico con dose registrata.
- `components/ObservationList.tsx`: elenco raggruppato, dettaglio dose e quota.
- `observationDistribution.ts` e `ObservationDistributionChart.tsx`: serie,
  tooltip e tabella del grafico, con valori registrati e non ricalcolati.
- `ElaborazioniMappe.tsx`: tabella dei punti GPS del registro e tooltip dei
  punti di controllo. La coltura accompagna il punto per formattare lo storico.
- `utils/observationPdf.ts`: dose nel PDF, nei tre formati locali.
- `utils/observationExcel.ts`: celle numeriche dose e quota; formato a un
  decimale per le nuove dosi, formato generale per le frazioni storiche.
- `utils/geoUtils.ts`: CSV dei rilievi, dose senza arrotondamento dei valori storici.
- `utils/observationDose.ts`: formattazione comune. I nuovi decimi sono mostrati
  con un decimale; le vecchie frazioni mantengono la rappresentazione numerica
  salvata, anche sotto il centesimo, senza alterare gli oggetti.

Le **celle interpolate IDW**, le relative statistiche, i riepiloghi di risparmio
e gli export GIS derivati non sono nuove dosi puntuali salvate: mantengono
precisioni proprie (CSV/DBF quattro decimali, GeoTIFF Float32, riepiloghi un
decimale). Non si modifica il modello IDW né il trattamento dei punti importati.
Tabacco e grano mantengono i rispettivi calcoli e formati.

## Storico e verifiche

Nessuna migrazione, UPDATE massivo o ricalcolo in GET. Le dosi storiche restano
identiche, anche quando non rispettano la nuova precisione; un nuovo POST è
invece sottoposto alla regola corrente.

- `src/utils/observationDose.test.ts`: aspettative letterali sotto il decimo,
  tutte le colture del catalogo, limiti di fase, API pure, PDF/Excel/CSV,
  immutabilità dei dati e serie del grafico.
- `api-server/src/routes/osservazioni.test.ts`: POST/GET con archivio simulato,
  verifica dose e quota, rigetto prima della scrittura e storico invariato.
- `/tests/dose-precision.html`: anteprima di sviluppo isolata dalla rete,
  con pomodoro e coltura del catalogo a residuo 0,06 e vecchie frazioni visibili.
