# Riferimento NDVI del tabacco: metodo e bibliografia

## Esito della revisione

Questa bibliografia contiene **55 articoli scientifici con DOI o collegamento stabile**. La ricerca ha combinato le query *tobacco NDVI remote sensing*, *Nicotiana tabacum vegetation index*, *tobacco UAV hyperspectral nitrogen*, *tobacco phenology remote sensing*, *tobacco canopy reflectance chlorophyll* e *tobacco disease remote sensing vegetation index* in OpenAlex, Crossref e pagine degli editori, con controllo dei duplicati.

La letteratura diretta sul tabacco dimostra che gli indici di vegetazione e la riflettanza sono utili per osservare sviluppo della chioma, clorofilla, stato azotato, acqua, patogeni, qualità e resa. Non fornisce però una soglia NDVI universale, ripetibile per ogni varietà, densità, suolo, data di trapianto e sensore. Per questo l'app usa una **curva fenologica operativa**, non una diagnosi automatica:

| DAT | Riferimento NDVI | Interpretazione operativa |
| --- | ---: | --- |
| 42 | 0,64 | sviluppo vegetativo |
| 55 | 0,70 | espansione della chioma |
| 65 | 0,79 | piena copertura |
| 75–85 | 0,80 | massimo vigore vegetativo |
| 95 | 0,75 | inizio fioritura / regressione |
| 110 | 0,68 | fioritura avanzata |
| 130 | 0,60 | maturazione avanzata |

I nodi 55, 65 e 75–85 DAT sono il riferimento agronomico operativo richiesto per NitroCrop NDVI. Il calo dopo il plateau rappresenta fioritura, maturazione e perdita di verde; va confermato in campo, soprattutto se cimatura, raccolte scalari, irrigazione o varietà modificano la fenologia. Per acquisizioni a copertura elevata, l'NDVI può saturare e un indice red-edge o una verifica fogliare può essere più sensibile.

## A. Studi diretti sul tabacco

1. **Zhang et al. (2023)** — *Hyperspectral Remote Sensing for Tobacco Quality Estimation, Yield Prediction, and Stress Detection: A Review of Applications and Methods*. Tabacco, sensori iperspettrali prossimali/UAV; sintesi su clorofilla, N, acqua, stress e resa. DOI: https://doi.org/10.3389/fpls.2023.1073346
2. **Sun et al. (2021)** — *Diagnosis of Nitrogen Nutrition in Flue-Cured Tobacco Based on UAV Visible Spectrum Platform*. Flue-cured tobacco, UAV RGB; diagnosi di stato azotato. DOI: https://doi.org/10.3964/j.issn.1000-0593(2021)02-0586-06
3. **Lai et al. (2023)** — *Monitoring of Leaf Chlorophyll Content in Flue-Cured Tobacco Based on Hyperspectral Remote Sensing of Unmanned Aerial Vehicle*. Flue-cured tobacco, UAV iperspettrale; stima SPAD/clorofilla. DOI: https://doi.org/10.12133/j.smartag.SA202303007
4. **Khan et al. (2020)** — *On the Performance of Temporal Stacking and Vegetation Indices for Detection and Estimation of Tobacco Crop*. Tabacco, Sentinel-2 e indici di vegetazione; riconoscimento e stima colturale. DOI: https://doi.org/10.1109/ACCESS.2020.2998079
5. **Li, Feng & Belgiu (2024)** — *Mapping Tobacco Planting Areas in Smallholder Farmlands Using Phenological-Spatial-Temporal LSTM from Time-Series Sentinel-1 SAR Images*. Tabacco, serie Sentinel-1; importanza della fenologia nel monitoraggio. DOI: https://doi.org/10.1016/j.jag.2024.103826
6. **Li et al. (2025)** — *Prediction and Mapping of Tobacco Yield with Fresh Leaf Mass Using Hyperspectral Sensing Data*. Tabacco, iperspettrale; legame tra spettro e resa/foglia fresca. DOI: https://doi.org/10.1016/j.atech.2025.100855
7. **Henry et al. (2023)** — *Spectral Discrimination of Macronutrient Deficiencies in Greenhouse Grown Flue-Cured Tobacco*. Flue-cured tobacco, spettroscopia; gli stress nutrizionali hanno firme diverse e non sono deducibili da solo NDVI. DOI: https://doi.org/10.3390/plants12020280
8. **Liu et al. (2025)** — *In-Field Estimation of Vertical Distribution of Total Nitrogen and Nicotine Content for Tobacco Plants Based on Multispectral and Texture Feature Fusion*. Tabacco, multispettrale; stima N/nicotina con caratteristiche di texture. DOI: https://doi.org/10.3389/fpls.2025.1647566
9. **Jia et al. (2024)** — *Estimating Equivalent Water Thickness of Tobacco Leaves Based on Water Hyperspectral Indices*. Flue-cured tobacco, spettrometro; il contenuto idrico altera la risposta spettrale. DOI: https://doi.org/10.11924/j.issn.1000-6850.casb2023-0031
10. **Zhu et al. (2019)** — *Mapping Tobacco Fields Using UAV RGB Images*. Tabacco, UAV RGB; delimitazione della chioma e delle parcelle. DOI: https://doi.org/10.3390/s19081791
11. **Li et al. (2024)** — *Extraction of Tobacco Planting Information Based on UAV High-Resolution Remote Sensing Images*. Tabacco, UAV RGB/multispettrale; estrazione delle aree e struttura di impianto. DOI: https://doi.org/10.3390/rs16020359
12. **Li et al. (2024)** — *Accurately Segmenting/Mapping Tobacco Seedlings Using UAV RGB Images Collected from Different Geomorphic Zones and Different Semantic Segmentation Models*. Tabacco, UAV RGB; effetto di ambiente e geomorfologia sul monitoraggio. DOI: https://doi.org/10.3390/plants13223186
13. **Lichtenthaler, Gitelson & Lang (1996)** — *Non-Destructive Determination of Chlorophyll Content of Leaves of a Green and an Aurea Mutant of Tobacco by Reflectance Measurements*. *Nicotiana tabacum*, riflettanza fogliare; base fisiologica per clorofilla e indici. DOI: https://doi.org/10.1016/S0176-1617(96)80283-5
14. **Jia et al. (2013)** — *Comparison of Different Methods for Estimating Nitrogen Concentration in Flue-Cured Tobacco Leaves Based on Hyperspectral Reflectance*. Flue-cured tobacco, iperspettrale fogliare; N e riflettanza. DOI: https://doi.org/10.1016/j.fcr.2013.06.009
15. **Alhassan et al. (2023)** — *Classification of Tobacco Using Remote Sensing and Deep Learning Techniques*. Tabacco, telerilevamento e deep learning; separazione colturale, non soglia di salute. DOI: https://doi.org/10.1002/agj2.21382
16. **Liu et al. (2013)** — *Using Leaf Spectral Reflectance to Monitor the Effects of Shading on Nicotine Content in Tobacco Leaves*. Tabacco, riflettanza fogliare; luce e architettura cambiano lo spettro. DOI: https://doi.org/10.1016/j.indcrop.2013.09.027
17. **Tattaris, Grant & Park (2013)** — *Remote Sensing Applications in Tobacco Yield Estimation and the Recommended Research in Zimbabwe*. Tabacco, telerilevamento; resa e limiti delle applicazioni. DOI: https://doi.org/10.1155/2013/941873
18. **Miphokasap et al. (2012)** — *Selection of Optimum Vegetative Indices for the Assessment of Tobacco Float Seedlings Response to Fertilizer Management*. Piantine di tabacco, indici di vegetazione; risposta alla gestione fertilizzante in vivaio. DOI: https://doi.org/10.5402/2012/450473
19. **Lin et al. (2023)** — *Automated Counting of Tobacco Plants Using Multispectral UAV Data*. Tabacco trapiantato, UAV multispettrale; copertura e numero di piante. DOI: https://doi.org/10.3390/agronomy13122861
20. **Yendrek et al. (2020)** — *Plot-Level Rapid Screening for Photosynthetic Parameters Using Proximal Hyperspectral Imaging*. Tabacco in campo e altre colture, iperspettrale prossimale; lo spettro risponde alla fisiologia. DOI: https://doi.org/10.1093/jxb/eraa068
21. **Rahman et al. (2023)** — *Hyperspectral Multivariate Linear Prediction Model of Tobacco (Nicotiana tabacum L.) Leaf Nitrogen Content*. Tabacco, iperspettrale; modello per N fogliare. DOI: https://doi.org/10.3329/bjb.v52i20.68227
22. **Miao et al. (2023)** — *Non-Invasive Assessment, Classification, and Prediction of Biophysical Parameters Using Reflectance Hyperspectroscopy*. Tabacco e colture di riferimento, riflettanza iperspettrale; bioparametri non sono equivalenti a un singolo NDVI. DOI: https://doi.org/10.3390/plants12132526
23. **Zhang et al. (2023)** — *UAV-Borne Hyperspectral Estimation of Nitrogen Content in Tobacco Leaves Based on Ensemble Learning Methods*. Tabacco, UAV iperspettrale; stima del N fogliare. DOI: https://doi.org/10.1016/j.compag.2023.108008
24. **Wang et al. (2024)** — *A Novel Feature Construction Method for Tobacco Chlorophyll Estimation Based on Integral of UAV-Borne Hyperspectral Reflectance Curve*. Tabacco, UAV iperspettrale; clorofilla. DOI: https://doi.org/10.1109/TGRS.2024.3443410
25. **Wang et al. (2018)** — *Estimating Leaf Chlorophyll Content in Tobacco Based on Various Canopy Hyperspectral Parameters*. Tabacco, parametri iperspettrali di chioma; clorofilla e struttura confondono un indice singolo. DOI: https://doi.org/10.1007/s12652-018-1043-5
26. **Peng et al. (2017)** — *Hyperspectral Imaging for Presymptomatic Detection of Tobacco Disease with Successive Projections Algorithm and Machine-Learning Classifiers*. Tabacco, imaging iperspettrale; patogeni possono imitare uno stress di vigore. DOI: https://doi.org/10.1038/s41598-017-04501-2
27. **Then­kabail et al. (1999)** — *Detecting Nitrogen Deficiency on Irrigated Cash Crops Using Remote Sensing Methods*. Colture commerciali irrigue, inclusi sistemi tabacchicoli; N e riflettanza. DOI: https://doi.org/10.1080/02571862.1999.10634847
28. **Meacham-Hensold et al. (2023)** — *Evaluating Potential of Leaf Reflectance Spectra to Monitor Plant Genetic Variation*. Tabacco e specie di prova, spettrometro fogliare; genotipo e architettura cambiano la risposta. DOI: https://doi.org/10.1186/s13007-023-01089-9
29. **Tian et al. (2022)** — *Rapid Quantification Method for Yield, Calorimetric Energy and Chlorophyll a Fluorescence Parameters in Nicotiana tabacum L. Using Vis-NIR-SWIR Hyperspectroscopy*. *Nicotiana tabacum*, Vis-NIR-SWIR; biomassa e fisiologia. DOI: https://doi.org/10.3390/plants11182406
30. **Hayes (2021)** — *Hyperspectral Reflectance for Non-Invasive Early Detection of Black Shank Disease in Flue-Cured Tobacco*. Flue-cured tobacco, iperspettrale; malattia come confondente della lettura. DOI: https://doi.org/10.1255/jsi.2021.a4
31. **Chen et al. (2023)** — *Classification Models for Tobacco Mosaic Virus and Potato Virus Y Using Hyperspectral and Machine Learning Techniques*. Tabacco, iperspettrale; patogeni e classificazione. DOI: https://doi.org/10.3389/fpls.2023.1211617
32. **Mao et al. (2025)** — *Machine Learning-Enabled UAV Hyperspectral Identification of Tomato Spotted Wilt Virus in Tobacco*. Tabacco, UAV iperspettrale; stress biotico. DOI: https://doi.org/10.3389/fpls.2025.1728043
33. **Moyankova et al. (2026)** — *Non-Destructive Detection of Heat Stress in Tobacco Plants Using Visible-Near-Infrared Spectroscopy and Aquaphotomics Approach*. Tabacco, Vis-NIR; calore e acqua alterano lo spettro. DOI: https://doi.org/10.3390/agriengineering8010033
34. **Luo et al. (2026)** — *Identification of Tobacco Leaf Diseases Using Hyperspectral Imaging and Machine Learning with SHAP Interpretability Analysis*. Tabacco, iperspettrale; diagnosi di malattie. DOI: https://doi.org/10.3389/fpls.2025.1711972
35. **Chen et al. (2026)** — *Classification of Tobacco Leaf Diseases Based on Multi-Source Remote Sensing Data*. Tabacco, dati multi-sorgente; patogeni e letture di chioma. DOI: https://doi.org/10.3389/fpls.2026.1727082

## B. Studi metodologici: limiti necessari per interpretare NDVI

36. **Baret & Guyot (1991)** — *Potentials and Limits of Vegetation Indices for LAI and APAR Assessment*. Multi-coltura, riflettanza di chioma; saturazione a LAI elevato. DOI: https://doi.org/10.1016/0034-4257(91)90009-U
37. **Gitelson (2004)** — *Wide Dynamic Range Vegetation Index for Remote Quantification of Biophysical Characteristics of Vegetation*. Frumento, soia, mais; dimostra saturazione NDVI e alternativa WDRVI. DOI: https://doi.org/10.1078/0176-1617-01176
38. **Gao et al. (2023)** — *Evaluating the Saturation Effect of Vegetation Indices in Forests Using 3D Radiative Transfer Simulations and Satellite Observations*. Simulazioni 3D e satellite; struttura della chioma e saturazione. DOI: https://doi.org/10.1016/j.rse.2023.113665
39. **Gu et al. (2013)** — *NDVI Saturation Adjustment: A New Approach for Improving Cropland Performance Estimates in the Greater Platte River Basin, USA*. Colture irrigue, satellite; correzione della saturazione. DOI: https://doi.org/10.1016/j.ecolind.2013.01.041
40. **Wang et al. (2005)** — *On the Relationship of NDVI with Leaf Area Index in a Deciduous Forest Site*. Serie pluriennale, sensori di chioma; relazione non lineare NDVI-LAI. DOI: https://doi.org/10.1016/j.rse.2004.10.006
41. **Huete (1988)** — *A Soil-Adjusted Vegetation Index (SAVI)*. Suolo e vegetazione, riflettanza; base per l'effetto fondo-suolo. DOI: https://doi.org/10.1016/0034-4257(88)90106-X
42. **Montandon & Small (2008)** — *The Impact of Soil Reflectance on the Quantification of the Green Vegetation Fraction from NDVI*. Suoli e copertura verde, satellite; il medesimo vigore può dare NDVI diversi. DOI: https://doi.org/10.1016/j.rse.2007.09.007
43. **Prudnikova, Savin & Vindeker (2019)** — *Influence of Soil Background on Spectral Reflectance of Winter Wheat Crop Canopy*. Frumento, spettrometro; colore e umidità del suolo cambiano gli indici. DOI: https://doi.org/10.3390/rs11161932
44. **Daughtry et al. (2000)** — *Estimating Corn Leaf Chlorophyll Concentration from Leaf and Canopy Reflectance*. Mais, foglia/chioma e modello SAIL; interazione LAI-suolo. DOI: https://doi.org/10.1016/S0034-4257(00)00113-9
45. **Xue & Su (2017)** — *Significant Remote Sensing Vegetation Indices: A Review of Developments and Applications*. Rassegna multi-coltura; effetti di angolo fogliare, filari e frazione di vuoto. DOI: https://doi.org/10.1155/2017/1353691
46. **Xie et al. (2018)** — *Vegetation Indices Combining the Red and Red-Edge Spectral Information for Leaf Area Index Retrieval*. Multi-coltura, red-edge; maggiore sensibilità oltre la saturazione NDVI. DOI: https://doi.org/10.1109/JSTARS.2018.2813281
47. **Peñuelas et al. (1993)** — *The Reflectance at the 950–970 nm Region as an Indicator of Plant Water Status*. Piante da coltura, NIR; acqua e riflettanza. DOI: https://doi.org/10.1080/01431169308954010
48. **Peñuelas & Filella (1998)** — *Visible and Near-Infrared Reflectance Techniques for Diagnosing Plant Physiological Status*. Rassegna fisiologica; l'NDVI non separa automaticamente le cause dello stress. DOI: https://doi.org/10.1016/S1360-1385(98)01213-8
49. **Mahlein et al. (2018)** — *Hyperspectral Sensors and Imaging Technologies in Phytopathology: State of the Art*. Patologia vegetale, iperspettrale; malattie e firme di clorofilla/acqua. DOI: https://doi.org/10.1146/annurev-phyto-080417-050100
50. **Mahlein et al. (2012)** — *Hyperspectral Imaging for Small-Scale Analysis of Symptoms Caused by Different Sugar Beet Diseases*. Barbabietola, iperspettrale; stress diversi possono avere risposte spettrali sovrapposte. DOI: https://doi.org/10.1186/1746-4811-8-3
51. **Wang, Yang & Kootstra (2023)** — *The Impact of Variable Illumination on Vegetation Indices and Evaluation of Illumination Correction Methods on Chlorophyll Content Estimation Using UAV Imagery*. UAV, clorofilla; nuvole e angolo solare modificano gli indici. DOI: https://doi.org/10.1186/s13007-023-01028-8
52. **Huete et al. (2002)** — *Overview of the Radiometric and Biophysical Performance of the MODIS Vegetation Indices*. MODIS, multi-bioma; aerosol e angolo di vista cambiano il confronto temporale. DOI: https://doi.org/10.1016/S0034-4257(02)00096-2
53. **Hadjimitsis et al. (2010)** — *Atmospheric Correction for Satellite Remotely Sensed Data Intended for Agricultural Applications: Impact on Vegetation Indices*. Agricoltura, satellite; correzione atmosferica per confronti affidabili. DOI: https://doi.org/10.5194/nhess-10-89-2010
54. **Lu et al. (2020)** — *Experimental Evaluation and Consistency Comparison of UAV Multispectral Minisensors*. Colture, UAV multispettrale; indici diversi tra sensori e calibrazioni. DOI: https://doi.org/10.3390/rs12162542
55. **Tucker (1979)** — *Red and Photographic Infrared Linear Combinations for Monitoring Vegetation*. Fondamento storico degli indici red-NIR; interpretazione dipendente da acquisizione e copertura. DOI: https://doi.org/10.1016/0034-4257(79)90013-0

## Come usare queste fonti

- Gli articoli **1–35** sono usati per confermare che la riflettanza e gli indici di vegetazione del tabacco variano con sviluppo, chioma, clorofilla, azoto, acqua e stress.
- Gli articoli **36–55** non fissano soglie tabacco: spiegano perché una lettura deve essere confrontata con fenologia, protocollo di acquisizione e osservazione in campo.
- Una lettura superiore al riferimento non è prova di assenza di problemi; una lettura inferiore non prova da sola una carenza di azoto. NitroCrop usa il confronto solo come supporto alla verifica tecnica e limita sempre la dose al piano azotato residuo.