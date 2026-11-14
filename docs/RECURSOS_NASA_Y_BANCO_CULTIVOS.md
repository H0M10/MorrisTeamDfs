# Análisis Técnico de los 24 Recursos del Reto y Banco de Cultivos FAO-56

**Autor:** ARGON (Auditoría técnica — NASA Space Apps Challenge 2026, equipo The CSC)  
**Regla rectora (`AGENTS.md` §1, §4 y §5):** Todo recurso usado en *Field Shift* declara fuente, fecha y escala nativa. No mezclamos escalas regionales (9–50 km) como si fueran de parcela (30 m), ni descargamos rasters pesados en laptops de 8 GB RAM / 48 h.

---

## 1. Veredicto por Grupos sobre los 24 Recursos Listados

| Grupo | Cantidad | Criterio técnico | Qué entra |
| --- | --- | --- | --- |
| **Grupo A — Núcleo Obligatorio** | 7 fuentes | Indispensables para balance hídrico FAO-56, índices satelitales de parcela, suelo, pendiente, etiquetas de cultivo y validación de modelos 1–4. Todo corre en Earth Engine / API ligera. | **SMAP**, **Landsat / HLS**, **NASA POWER**, **SRTM**, **USDA CDL**, **OpenET**, **SSURGO / SoilGrids** (+ **Copernicus Sentinel-2** dentro de HLS S30) |
| **Grupo B — Enriquecimiento / Contexto (sin bloquear G2/G3)** | 10 fuentes | Aportan validación cruzada, contexto económico/agronómico, estrés térmico puntual o respaldo global. Se integran como contexto en API / `crop_bank` / GEE opcional sin frenar el núcleo. | **GPM IMERG**, **ECOSTRESS**, **PRISM**, **FAO GAEZ**, **USDA QuickStats**, **USDA AMS Market News**, **USGS NWIS**, **USDA Ag Data Commons**, **Web Soil Survey (WSS)**, **MODIS/VIIRS** (solo contexto fenológico grueso) |
| **Grupo C — Excluidos por `AGENTS.md` §4 (con sustento ante jueces)** | 7 fuentes | Redundantes con el núcleo, diseñados para bosque en lugar de cultivo anual, demasiado pesados en almacenamiento/red o dependientes de estaciones locales dispersas. | **GEDI**, **LANDFIRE**, **NAIP**, **NLCD**, **CoCoRaHS**, **NLDAS/GLDAS**, **ERA5** |

---

## 2. Evaluación Recurso por Recurso (los 24 recursos oficiales)

### Grupo A — Núcleo Obligatorio (Base del Motor y Modelos 1–4)

| # | Recurso | Qué aporta realmente | Escala / Cadencia | Uso exacto en Field Shift | Estado |
| --- | --- | --- | --- | --- | --- |
| 1 | **NASA POWER** (`power.larc.nasa.gov`) | Temperatura máx./mín., radiación solar, viento a 2 m, punto de rocío y lluvia diaria desde 1981 sin llave. | ~50 km · Diario (agregado mensual) | Motor FAO-56 ($ET_0$ Penman-Monteith), frecuencia histórica de heladas y golpes de calor; cliente cacheado en `backend/app/sources/power.py`. | **Activo en núcleo** |
| 2 | **Landsat + Copernicus Sentinel-2 (HLS L30 / S30)** | Reflectancia armonizada superficial (Blue, Green, Red, NIR, SWIR1, SWIR2). Sentinel-2 añade borde rojo (bandas Red-Edge). | 30 m (HLS) / 10–20 m (S2) · 2–5 días | Tira RGB real de 36 meses, NDVI, NDMI, BSI y NDTI (rastrojo). **Regla científica:** NDRE es opcional solo con Sentinel-2 (HLS S30), nunca con Landsat; CAI no existe en Landsat/S2 (se usa NDTI). | **Activo en núcleo** |
| 3 | **SMAP** (`SPL4SMGP`) | Humedad superficial y de zona de raíces asimilada y estado de congelamiento. | 9 km · Cada ~2–3 días | Contexto regional de humedad (nunca mostrado como dato de parcela 30 m) y etiqueta objetivo del **Modelo 4 (CQR 90 %)**. | **Activo en núcleo** |
| 4 | **USDA CDL (CropScape)** | Clasificación anual de cultivo por píxel en EE. UU. (más de 100 códigos: alfalfa=36, maíz=1, sorgo=4, frijol=42, soya=5, trigo=23/24, etc.). | 30 m · Anual (EE. UU.) | Etiquetas para valles de entrenamiento (Diamond Valley NV, ID, UT) y secuencia histórica para **Modelos 1, 2 y 3**. | **Activo en núcleo (`labeled`)** |
| 5 | **OpenET** (`ENSEMBLE/CONUS/GRIDMET`) | Evapotranspiración observada real multi-modelo calibrada satelitalmente para el oeste de EE. UU. | 30 m · Mensual (Oeste EE. UU.) | Etiqueta real del **Modelo 1** (consumo mensual en mm por cultivo) y validación frente a tabla FAO-56. | **Activo en núcleo (`labeled`)** |
| 6 | **USDA SSURGO / WSS** (EE. UU.) + **SoilGrids** (Global) | Textura (arcilla, limo, arena), carbono orgánico (`soc`), grupo hidrológico y capacidad de agua disponible (`AWC`). WSS es la interfaz web oficial de SSURGO/STATSGO2. | Polígonos finos (SSURGO) / 250 m (SoilGrids) | Perfil de suelo en `table_to_contract.py` (`organic_matter_pct` vía factor Van Bemmelen `soc_gkg * 0.1724`, `awc_mm_m` de SSURGO en EE. UU. o pedotransferencia declarada sobre SoilGrids en Querétaro). | **Activo en núcleo** |
| 7 | **SRTM** (`USGS/SRTMGL1_003`) | Elevación, pendiente y aspecto topográfico global. | 30 m · Estático | Ajuste barométrico en $ET_0$ (`power_monthly`), cálculo de pendiente en radianes y evaluación de riesgo de escorrentía/erosión. | **Activo en núcleo** |

---

### Grupo B — Enriquecimiento de Alto Valor (permitidos por `AGENTS.md` §4 sin bloquear G2/G3)

| # | Recurso | Qué aporta realmente | Escala / Latencia | Recomendación ARGON (para expandir datos sin romper tiempos) |
| --- | --- | --- | --- | --- |
| 8 | **Copernicus Sentinel-2** (`COPERNICUS/S2_SR_HARMONIZED` / HLS S30) | Alta resolución (10–20 m) y bandas **Red-Edge** (B5/B6/B7) para detectar estrés de clorofila temprano (`NDRE`). | 10–20 m · 5 días | **SÍ sumar en GEE opcional:** añadir campo opcional `ndre` solo cuando provenga de HLS S30 / Sentinel-2, declarando que Landsat carece de borde rojo (`AGENTS.md` §4). |
| 9 | **GPM IMERG** (`NASA/GPM_L3/IMERG_MONTHLY_V07`) | Lluvia satelital global calibrada (útil donde no hay estaciones y para picos convectivos de verano en Querétaro). | ~10 km (0.1°) · 30 min / mensual | **SÍ sumar en `data-pipeline` opcional:** agregar columna `imerg_rain_mm` en GEE para comparar lluvia satelital vs POWER 50 km en las fichas de evidencia. |
| 10 | **ECOSTRESS** (AppEEARS / GEE) | Temperatura superficial terrestre (LST) y estrés evaporativo (ESI) a 70 m en horas críticas de la tarde. | ~70 m · Cola asíncrona | **SÍ como enriquecimiento de G3/G4:** perfecto para identificar estrés térmico vespertino en alfalfa o hortalizas en Diamond Valley si la cola de AppEEARS responde antes del sábado 20:00. |
| 11 | **PRISM** (`OREGONSTATE/PRISM/AN81m`) | Normales climáticas de 30 años, temperaturas ajustadas por topografía y precipitación en EE. UU. | ~800 m–4 km · Mensual | **SÍ para valles de EE. UU.:** está disponible directo en Google Earth Engine; aporta línea base climática de 30 años más fina en valles montañosos como Diamond Valley (Nevada). |
| 12 | **USGS NWIS** (`waterdata.usgs.gov/nwis`) | Niveles reales de pozos subterráneos y caudal de ríos en EE. UU. | Puntual (pozo/estación) | **SÍ para contexto de cuenca en Diamond Valley:** valida localmente la tendencia de abatimiento del acuífero citada en el reto junto con la ficha del agricultor. |
| 13 | **FAO GAEZ + FAO-56** (`gaez.fao.org`) | Idoneidad agroecológica global por cultivo y coeficientes hídricos estándar de 24+ cultivos. | ~9 km (GAEZ) / Tabular (FAO-56) | **SÍ integrado hoy en nuestro Banco de Cultivos (`models/fao56_crop_bank.csv`):** permite ampliar de 4 grupos básicos a **24 cultivos de riego y cobertura** en todo el mundo sin inventar datos. |
| 14 | **USDA NASS QuickStats** | Rendimientos históricos, superficie sembrada y cosechada por condado/estado en EE. UU. | Condado · Anual | **SÍ para contextualizar rotaciones reales:** informa al agricultor qué cultivos de nuestra lista de 24 realmente se siembran a escala comercial en Eureka County, NV / Idaho / Utah. |
| 15 | **USDA AMS Market News** | Precios y demanda comercial de forrajes, granos y hortalizas. | Mercado regional · Semanal | **SÍ para restricción `buyer_ok`:** valida precios/mercado de cultivos alternativos (heno de alfalfa vs cebada, frijol, girasol, canola) antes de sugerirlos. |
| 16 | **USDA Ag Data Commons** | Repositorios abiertos de ensayos agronómicos y rotación de cultivos. | Estudios puntuales | **Solo consulta puntual:** útil para documentar evidencia cualitativa en `evidence_card.supporting_evidence` o validar `crop_traits.py` (`H-03`). |
| 17 | **MODIS / VIIRS** (`MOD13Q1` / `VNP13A1`) | Series largas continuas (2000–presente) de NDVI/EVI cuando HLS tiene huecos por nubes. | 250 m – 1 km | **Respaldo regional secundario:** demasiado grueso (250–1000 m) para una parcela individual de 30–60 ha frente a Landsat/HLS (30 m), útil solo como contexto regional o para detectar fenología de valle. |

---

### Grupo C — Excluidos Explícitamente (`AGENTS.md` §4) y Cómo Defenderlo ante Jueces

Si un juez pregunta *"¿por qué no incluyeron NAIP, GEDI, ERA5 o NLCD?"*, la respuesta técnica es sólida y demuestra criterio científico:

1. **GEDI** *(Láser de estructura forestal, ~25 m huella discontinua)*: Mide altura de dosel arbóreo y biomasa forestal. **No sirve para cultivos anuales ni forrajes bajos** (alfalfa/trigo/maíz sufren confusión con la rugosidad del suelo).
2. **USFS LANDFIRE** *(Combustibles forestales y riesgo de incendio)*: Diseñado para ecología forestal y manejo de incendios silvestres, no para parcelas agrícolas bajo pivote central.
3. **NAIP** *(Fotografía aérea 1 m en EE. UU.)*: Pesa decenas de GB para múltiples valles, solo tiene cobertura cada 2–3 años en verano (no sirve para secuencias mensuales de 36 meses) y viola la restricción de RAM de 8 GB en local. HLS 30 m + Sentinel-2 10 m resuelven mejor la serie temporal.
4. **NLCD** *(Cobertura general cada 2–5 años, 30 m)*: Solo distingue clases amplias ("Cultivated Crops" / "Hay-Pasture"). **USDA CDL** ya entrega exactamente el cultivo específico año con año a la misma resolución de 30 m.
5. **CoCoRaHS** *(Pluviómetros ciudadanos puntuales)*: Cobertura muy irregular en zonas áridas rurales como Diamond Valley, NV y nula en Querétaro rural. **NASA POWER** + **GPM IMERG** dan cobertura continua y reproducible.
6. **NLDAS / GLDAS** *(Asimilación meteorológica/hídrica ~12–25 km)*: Redundante con **NASA POWER** (clima diario agrícola listo para Penman-Monteith) y **SMAP** (humedad observada a 9 km); añadir NLDAS duplicaría descargas sin mejorar la escala de parcela (30 m).
7. **ERA5** *(Reanálisis horario global ECMWF, ~31 km)*: Excelente reanálisis, pero en 48 h la cola del Copernicus Climate Data Store (CDS) es lenta y pesada; **NASA POWER** ya reempaqueta las variables diarias agroclimáticas (Tmax, Tmin, radiación, viento, punto de rocío) al instante sin llave, y **PRISM** cubre EE. UU. con corrección topográfica.

---

## 3. Banco Ampliado de Cultivos y Coberturas (`models/fao56_crop_bank.csv`)

Expandimos el sistema más allá de los 4 grupos iniciales (`alfalfa`, `small_grain`, `corn`, `fallow`) hacia un **Banco Agronómico de 24 especies de riego y cobertura** (más 8 códigos alias de rastrojo/dormancia ya presentes en los fixtures):

- **Forrajes de alto consumo:** Alfalfa (`alfalfa`, `alfalfa_dormant`), Trébol de cobertura (`trebol_cobertura`).
- **Cereales de grano pequeño y menor agua:** Cebada (`cebada_forrajera`), Avena (`avena_forrajera`), Trigo de invierno (`trigo_invierno`), Trigo de primavera (`trigo_primavera`).
- **Granos de verano:** Maíz (`maiz`), Milpa maíz-frijol (`maiz_frijol`), Sorgo grano (`sorgo_grano`).
- **Leguminosas fijadoras de nitrógeno:** Frijol seco (`frijol_seco`), Garbanzo (`garbanzo`), Lenteja (`lenteja`), Soya (`soya`).
- **Oleaginosas y fibra tolerantes/alternativas:** Girasol (`girasol`), Canola (`canola`), Algodón (`algodon`).
- **Raíces y hortalizas de alto valor (sensibles a humedad, $Z_r$ corto):** Papa (`papa`), Cebolla (`cebolla`), Tomate (`tomate`), Chile (`chile`), Ajo (`ajo`), Brócoli (`brocoli`).
- **Coberturas de protección de suelo (`sold: false`) y rastrojos:** Avena de cobertura (`avena_cubierta`), Avena-veza (`avena_veza`), Cobertura mixta (`cubierta_mixta`), Triticale de cobertura (`triticale_cobertura`), Barbecho/Rastrojo (`barbecho` y alias de rastrojo).

Cada registro declara en [models/fao56_crop_bank.csv](../models/fao56_crop_bank.csv):
- $K_{c\,\text{ini}}$, $K_{c\,\text{mid}}$, $K_{c\,\text{end}}$ (FAO Irrigation and Drainage Paper 56, Allen et al., 1998, **Tabla 12**, pp. 110–114; **Cap. 11** para suelo desnudo/rastrojo $K_{c,\min}=0.20$).
- Profundidad efectiva de raíces $Z_r$ (m) y fracción de agotamiento $p$ (**FAO-56 Tabla 22**).
- Códigos equivalentes en **USDA CDL** (`cdl_codes`) para cruzar etiquetas reales de EE. UU.
- Requisitos operativos (`sown`, `sold`, `machinery`) mapeados a `crop_traits.py` (mantenidos explícitamente como `assumed` hasta revisión de `H-03`).
