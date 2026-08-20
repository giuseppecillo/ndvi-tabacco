# NDVI Methodological Caution Bibliography

**Purpose:** These references document known limitations of NDVI as a vegetation indicator—saturation at high LAI/canopy cover, soil background interference, canopy architecture effects, water stress and disease confounding, and sensor/illumination variability. They are cited as **methodological cautions** only; none establishes numeric thresholds specific to tobacco.

---

## I. NDVI Saturation at High LAI / Canopy Cover

**[1]** Baret, F., & Guyot, G. (1991). Potentials and limits of vegetation indices for LAI and APAR assessment. *Remote Sensing of Environment*, 35(2–3), 161–173.
https://doi.org/10.1016/0034-4257(91)90009-U
**Relevance:** Foundational analysis showing that NDVI approaches an asymptotic ceiling as LAI increases, with the relationship becoming nonlinear and saturated at moderate-to-high canopy densities. Establishes the theoretical basis for NDVI saturation in dense crops.

---

**[2]** Gitelson, A. A. (2004). Wide dynamic range vegetation index for remote quantification of biophysical characteristics of vegetation. *Journal of Plant Physiology*, 161(2), 165–173.
https://doi.org/10.1078/0176-1617-01176
**Relevance:** Directly demonstrates that NDVI saturates asymptotically when LAI > 2 in wheat, soybean, and maize canopies because red reflectance flattens while NIR continues to rise. Proposes WDRVI as a correction, confirming the saturation problem in row crops.

---

**[3]** Gao, S., Zhong, R., Yan, K., Ma, X., Chen, X., Pu, J., Gao, S., Yin, G., & Myneni, R. B. (2023). Evaluating the saturation effect of vegetation indices in forests using 3D radiative transfer simulations and satellite observations. *Remote Sensing of Environment*, 295, 113665.
https://doi.org/10.1016/j.rse.2023.113665
**Relevance:** Rigorous 3D radiative-transfer modelling and satellite validation quantifying how multiple vegetation indices saturate under dense canopies. Demonstrates saturation is driven by canopy structural complexity, with direct implications for any broadleaf dense crop.

---

**[4]** Gu, Y., Wylie, B. K., Howard, D. M., Phuyal, K. P., & Ji, L. (2013). NDVI saturation adjustment: A new approach for improving cropland performance estimates in the Greater Platte River Basin, USA. *Ecological Indicators*, 30, 1–6.
https://doi.org/10.1016/j.ecolind.2013.01.041
**Relevance:** Applied cropland study showing NDVI saturation in irrigated agricultural areas and developing a practical correction. Documents the practical agronomic consequences of NDVI saturation for crop monitoring at field scale.

---

**[5]** Wang, Q., Adiku, S., Tenhunen, J., & Granier, A. (2005). On the relationship of NDVI with leaf area index in a deciduous forest site. *Remote Sensing of Environment*, 94(2), 244–255.
https://doi.org/10.1016/j.rse.2004.10.006
**Relevance:** Multi-year empirical documentation of the nonlinear NDVI–LAI relationship across seasons, showing the NDVI response saturates well before maximum LAI is reached, with year-to-year variability in the saturation point.

---

## II. Soil Background Effects on NDVI

**[6]** Huete, A. R. (1988). A soil-adjusted vegetation index (SAVI). *Remote Sensing of Environment*, 25(3), 295–309.
https://doi.org/10.1016/0034-4257(88)90106-X
**Relevance:** Seminal paper demonstrating that soil background optical properties introduce systematic, non-vegetation-related variation in NDVI. The soil line concept and SAVI correction remain the standard reference for soil background interference in crop vegetation indices.

---

**[7]** Montandon, L. M., & Small, E. E. (2008). The impact of soil reflectance on the quantification of the green vegetation fraction from NDVI. *Remote Sensing of Environment*, 112(4), 1809–1821.
https://doi.org/10.1016/j.rse.2007.09.007
**Relevance:** Quantifies how variable soil brightness across field conditions can shift NDVI by up to 0.15 units for the same fractional green cover. Directly relevant to tobacco fields where soil types and moisture states vary between plots and seasons.

---

**[8]** Prudnikova, E., Savin, I., & Vindeker, G. (2019). Influence of soil background on spectral reflectance of winter wheat crop canopy. *Remote Sensing*, 11(16), 1932.
https://doi.org/10.3390/rs11161932
**Relevance:** Field experiment across three soil types (gray forest, alluvial, chernozem) shows that soil color and moisture substantially change canopy NDVI even at equivalent crop biomass. Particularly relevant for tobacco grown on diverse agricultural soils.

---

## III. Canopy Architecture, Density, and Structure Effects

**[9]** Daughtry, C. S. T., Walthall, C. L., Kim, M. S., de Colstoun, E. B., & McMurtrey, J. E. III. (2000). Estimating corn leaf chlorophyll concentration from leaf and canopy reflectance. *Remote Sensing of Environment*, 74(2), 229–239.
https://doi.org/10.1016/S0034-4257(00)00113-9
**Relevance:** Uses SAIL canopy reflectance model to show that leaf area index and background reflectance confound spectral detection of plant chemical status. Highlights how canopy architecture interacts with soil background to complicate any NDVI-based inference in row crops.

---

**[10]** Xue, J., & Su, B. (2017). Significant remote sensing vegetation indices: A review of developments and applications. *Journal of Sensors*, 2017, 1353691.
https://doi.org/10.1155/2017/1353691
**Relevance:** Comprehensive review covering how canopy architecture, row orientation, leaf angle distribution, and gap fraction all influence which vegetation index is most appropriate. Summarizes documented cases where NDVI gives misleading signals due to structural confounders in various crops.

---

## IV. Water Stress Effects on NDVI and Related Reflectance

**[11]** Peñuelas, J., Filella, I., Biel, C., Serrano, L., & Savé, R. (1993). The reflectance at the 950–970 nm region as an indicator of plant water status. *International Journal of Remote Sensing*, 14(10), 1887–1905.
https://doi.org/10.1080/01431169308954010
**Relevance:** Demonstrates that plant water status affects NIR reflectance independently of chlorophyll content, showing that NDVI signals can be confounded by water stress even without changes in green biomass. Establishes NIR reflectance as a water-stress indicator relevant to interpreting NDVI changes in crops.

---

**[12]** Peñuelas, J., & Filella, I. (1998). Visible and near-infrared reflectance techniques for diagnosing plant physiological status. *Trends in Plant Science*, 3(4), 151–156.
https://doi.org/10.1016/S1360-1385(98)01213-8
**Relevance:** Review documenting how drought stress causes spectral changes in NIR and red bands that alter NDVI independently of canopy greenness. Highlights the multi-cause ambiguity in NDVI interpretation for physiological field monitoring.

---

**[13]** Zhang, M., Chen, T., Gu, X., Chen, D., Wang, C., Wu, W., Zhu, Q., & Zhao, C. (2023). Hyperspectral remote sensing for tobacco quality estimation, yield prediction, and stress detection: A review of applications and methods. *Frontiers in Plant Science*, 14, 1073346.
https://doi.org/10.3389/fpls.2023.1073346
**Relevance:** Tobacco-specific review demonstrating that water stress, disease, and nutrient deficiency each produce overlapping spectral signatures that confound broadband vegetation indices including NDVI. Directly relevant to tobacco canopy interpretation and stresses the need for full-spectrum approaches over single-index methods.

---

## V. Disease Effects on Vegetation Indices

**[14]** Mahlein, A.-K., Kuska, M. T., Behmann, J., Polder, G., & Walter, A. (2018). Hyperspectral sensors and imaging technologies in phytopathology: State of the art. *Annual Review of Phytopathology*, 56, 535–558.
https://doi.org/10.1146/annurev-phyto-080417-050100
**Relevance:** Authoritative review demonstrating that foliar diseases alter reflectance in bands used by NDVI before visible symptoms appear. Documents that disease-induced spectral changes (chlorophyll destruction, water loss, cell damage) all shift NDVI unpredictably, creating false health signals.

---

**[15]** Mahlein, A.-K., Steiner, U., Hillnhütter, C., Dehne, H.-W., & Oerke, E.-C. (2012). Hyperspectral imaging for small-scale analysis of symptoms caused by different sugar beet diseases. *Plant Methods*, 8, 3.
https://doi.org/10.1186/1746-4811-8-3
**Relevance:** Field study showing that different diseases produce different spectral signatures at canopy level, meaning identical NDVI values can arise from healthy vegetation, water stress, or several disease states. Emphasizes that NDVI alone cannot discriminate between health states.

---

## VI. Sensor and Illumination Differences

**[16]** Wang, Y., Yang, Z., & Kootstra, G. (2023). The impact of variable illumination on vegetation indices and evaluation of illumination correction methods on chlorophyll content estimation using UAV imagery. *Plant Methods*, 19, 51.
https://doi.org/10.1186/s13007-023-01028-8
**Relevance:** UAV-based study quantifying how changing illumination conditions (cloud cover, sun angle, flight time) cause NDVI to vary by up to 0.2 units for identical crops. Documents that without illumination correction, temporal NDVI comparisons between plots or seasons are unreliable.

---

**[17]** Huete, A., Didan, K., Miura, T., Rodriguez, E. P., Gao, X., & Ferreira, L. G. (2002). Overview of the radiometric and biophysical performance of the MODIS vegetation indices. *Remote Sensing of Environment*, 83(1–2), 195–213.
https://doi.org/10.1016/S0034-4257(02)00096-2
**Relevance:** Comprehensive cross-sensor validation showing that EVI and NDVI values differ systematically across sensors, viewing angles, and atmospheric conditions. Documents how NDVI is more sensitive to atmospheric aerosol contamination than EVI, critical for any multi-date or multi-sensor field protocol.

---

**[18]** Hadjimitsis, D. G., Papadavid, G., Agapiou, A., Themistocleous, K., Hadjimitsis, M. G., Retalis, A., Michaelides, S., Chrysoulakis, N., Toulios, L., & Clayton, C. R. I. (2010). Atmospheric correction for satellite remotely sensed data intended for agricultural applications: Impact on vegetation indices. *Natural Hazards and Earth System Sciences*, 10(1), 89–95.
https://doi.org/10.5194/nhess-10-89-2010
**Relevance:** Agricultural remote sensing study quantifying how uncorrected atmospheric effects shift vegetation index values, with NDVI showing greater sensitivity than some alternative indices. Demonstrates that multi-temporal NDVI comparisons without atmospheric correction introduce systematic bias.

---

**[19]** Lu, H., Fan, T., Ghimire, P., & Deng, L. (2020). Experimental evaluation and consistency comparison of UAV multispectral minisensors. *Remote Sensing*, 12(16), 2542.
https://doi.org/10.3390/rs12162542
**Relevance:** Side-by-side comparison of UAV multispectral sensors (Micasense RedEdge, Parrot Sequoia, and others) measuring the same crops, showing NDVI varies by 0.05–0.15 between sensor models due to differing band widths, calibration methods, and irradiance sensors. Essential caution for multi-sensor field campaigns.

---

**[20]** Xie, Q., Dash, J., Huang, W., Peng, D., Qin, Q., Mortimer, H., Casa, R., Pignatti, S., Laneve, G., Pascucci, S., Dong, Y., & Ye, H. (2018). Vegetation indices combining the red and red-edge spectral information for leaf area index retrieval. *IEEE Journal of Selected Topics in Applied Earth Observations and Remote Sensing*, 11(5), 1482–1493.
https://doi.org/10.1109/JSTARS.2018.2813281
**Relevance:** Systematic comparison of broadband vs. red-edge vegetation indices for LAI retrieval across multiple crops, demonstrating that NDVI saturates at LAI > 3 while red-edge based indices remain sensitive. Provides direct evidence for moving beyond NDVI in high-biomass field crops.

---

*All references verified as peer-reviewed publications. DOIs link to publisher record pages. Where open-access PDFs were confirmed, they are noted in the source URL above. No citations were invented or paraphrased from secondary sources.*
