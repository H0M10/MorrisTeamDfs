# Plan de datos — qué aporta cada recurso del reto y cómo se obtiene

Escrito el 2026-11-14 por Claude para Hanniel y Checo (dupla Backend/Datos).
Las marcas **Verificado hoy** son llamadas reales hechas ese día desde la laptop;
lo demás sale de la documentación de cada servicio y hay que comprobarlo con
`ee_coverage.py` o con una llamada real antes de depender de ello.

## 0. Qué sacamos de cada recurso, pregunta por pregunta

El reto pide comparar al menos tres rotaciones (incluida la actual) y decir para
cada una por qué se sugiere, qué evidencia la apoya, qué beneficios tiene, qué
información falta y qué riesgos debe revisar alguien local. Eso se traduce en
ocho preguntas del agricultor. Cada recurso vale por la pregunta que contesta;
si no contesta ninguna, sobra.

Columnas: **DV** = Diamond Valley (nivel 1); **MX** = Querétaro y norte de
Guanajuato (nivel 3). "Tabla real" = ya viene en
`backend/data/diamond_valley.parquet` (36 meses, 2022–2024).

### 1. ¿Qué tengo sembrado y qué hubo antes?

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| CDL | Clase de cultivo por año y píxel | `timeline.crop_code`, rotación `current` | Tabla real | No existe |
| HLS (Landsat + Sentinel-2) | NDVI mensual: cuántos ciclos verdes hay al año y cuándo se siembra y cosecha; color medio | La tira de la parcela, `indices` | Tabla real | Verificado en GEE |
| MODIS / VIIRS | Fenología y cobertura regional a 250–1000 m | Solo contexto: "en la región el ciclo empieza en…" | Opcional | Verificado (cobertura 2024) |
| El agricultor | Historial declarado | Rotación `current` donde no hay CDL | — | Obligatorio |

### 2. ¿Cuánta agua usa cada cultivo?

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| OpenET | ET real mensual por campo (mm) | `et_mm`; etiqueta del modelo 1 | Tabla real | No existe |
| NASA POWER | Tmax, Tmin, rocío, viento y radiación → ET de referencia (Penman-Monteith) | `et0`; agua de cada rotación con FAO-56 | Tabla real | Verificado |
| ECOSTRESS | ET instantánea a 70 m, pocas pasadas | Validación puntual del agua estimada | Pendiente | Pendiente |

### 3. ¿Cuánta agua tengo y cuánta cae?

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| NASA POWER | Lluvia diaria a ~50 km | `rain_mm` | Tabla real | Verificado |
| GPM IMERG | Lluvia satelital a ~10 km; capta mejor las tormentas de verano del Bajío | Comparar con POWER; riesgo de lluvias intensas | Pendiente | Verificado en GEE (1998–2025) |
| PRISM | Lluvia y temperatura a ~4 km con relieve | Clima más fino en valles de montaña | Pendiente | No existe |
| SMAP | Humedad del suelo a 9 km | `soil_moisture` (regional); modelo 4 | Tabla real | Verificado en GEE (2015–2026) |
| USGS NWIS | Niveles medidos de pozos | `basin_context`: tendencia del acuífero | Pendiente (falta elegir pozos con registro reciente) | No existe |
| El agricultor | Agua que puede usar (pozo, concesión) | `constraints.max_water_mm_year` | Pendiente (H-13) | Pendiente |

### 4. ¿Qué aguanta el clima de mi zona?

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| NASA POWER | Días con helada y con calor por mes, desde 1981 | `frost_days`, `heat_days`, riesgos de cada rotación | Tabla real | Verificado |
| PRISM | Fechas de primera y última helada; normales de 30 años | Ventana de siembra con dato, no declarada | Pendiente | No existe |
| ECOSTRESS | Temperatura de la superficie por la tarde | Puntos calientes de estrés | Pendiente | Pendiente |
| FAO GAEZ | Aptitud climática por cultivo | Filtro de cultivos candidatos | Opcional | **Principal**: es lo único de la lista que dice qué cultivos caben |

### 5. ¿Cómo es mi suelo y mi terreno?

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| SSURGO / STATSGO2 (Web Soil Survey es la misma base en web) | Textura, materia orgánica, agua disponible, grupo hidrológico, factor K, capa limitante | `soil_profile` (observado) | Verificado (API sin llave); **falta integrarlo** | No existe |
| SoilGrids | Textura y carbono a 250 m | `soil_profile` (modelado) | Tabla real | Verificado en GEE |
| SRTM | Elevación y pendiente | `slope_pct`; ET de referencia; riesgo de escurrimiento | Tabla real | Verificado en GEE |
| FAO GAEZ | Restricciones de suelo por cultivo | Riesgos en la ficha | Opcional | Pendiente |

**Ojo con SoilGrids:** está en `AGENTS.md`, pero **no aparece en la lista del
reto** (es de ISRIC). En México es la única fuente de propiedades de suelo que
tenemos. Se puede seguir usando si se declara; si el equipo quiere apegarse
solo a la lista, en México el suelo quedaría como "información que falta".

### 6. ¿Mi suelo queda desnudo y se erosiona?

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| HLS | BSI (suelo desnudo) y NDTI (rastrojo) por mes | `soil_cover_months_36m`; beneficio de "más suelo" | Tabla real | Verificado |
| Sentinel-2 | 10–20 m y borde rojo | Ya entra dentro de HLS S30; NDRE opcional | — | — |
| IMERG + SRTM | Lluvias intensas sobre pendiente | Riesgo cualitativo de erosión (RUSLE opcional) | Pendiente | Pendiente |

### 7. ¿Qué siembran campos parecidos y qué pasó después?

De aquí deben salir las rotaciones alternativas, en lugar de plantillas.

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| CDL | Censo de cultivos y transiciones año con año dentro del valle | Cultivos candidatos y rotaciones observadas | Censo del condado hecho; **falta el del valle** | No existe |
| QuickStats | Superficie y rendimiento por condado | Confirma el censo; rendimientos reales | Necesita llave | No existe |
| Ag Data Commons | Ensayos de rotación publicados | Evidencia citada en la ficha | Consulta puntual | Consulta puntual |
| FAO GAEZ | Rendimiento potencial por cultivo | Comparar alternativas | Opcional | Principal |

### 8. ¿Lo puedo vender?

| Recurso | Qué se saca | Dónde termina | DV | MX |
| --- | --- | --- | --- | --- |
| AMS Market News | Precios de heno y granos | Restricción de comprador con dato | Necesita llave | No existe |
| QuickStats | Producción del condado | Contexto | Necesita llave | No existe |
| El agricultor | Cultivos sin comprador | `constraints.crops_without_buyer` | Pendiente | **Única fuente** |

### ¿Qué tan confiable es cada cifra?

Pares para validar: OpenET contra FAO-56 (modelo 1); SMAP para el modelo 4;
pozos de NWIS contra SMAP; IMERG contra la lluvia de POWER.

### Lo que no contesta ninguna pregunta nueva

- **NAIP:** no sirve para series mensuales. Solo podría ayudar a trazar a ojo los linderos de parcelas en EE. UU.
- **NLCD:** CDL dice lo mismo, pero por cultivo.
- **NLDAS / GLDAS y ERA5:** repiten lo que ya dan POWER y SMAP.
- **GEDI y LANDFIRE:** son para bosque.
- **CoCoRaHS:** no hay estaciones útiles en Diamond Valley ni en México.

### Orden de trabajo hasta la compuerta de las 19:00

1. **Ya está en la tabla real:** POWER, HLS, CDL, OpenET, SMAP, SRTM y SoilGrids.
2. **Siguiente, barato y sin llave:** transiciones de CDL en el valle, IMERG, pozos de NWIS, SSURGO por API y GAEZ para México.
3. **Si sobra tiempo:** PRISM, QuickStats y AMS (con llave), ECOSTRESS y MODIS.

**Tablas reales al 2026-11-14 14:40** (`backend/data/`, 36 meses cada una, las
tres válidas contra el contrato en `DATA_MODE=real`):

| Parcela | Cómo se eligió | Qué muestran los datos |
| --- | --- | --- |
| `dv-nv-01` (45 ha) | Pivote donde CDL dio alfalfa en 2022–2024 (`ee_pick_parcels.py pivot`) | OpenET en julio: 165 a 195 mm, con ET de referencia de 215 a 230 mm. El rectángulo anterior daba 149 mm porque incluía 17–22 % de matorral |
| `qro-sjr-01` (13 ha) | Mancha más compacta de riego probable (`ee_pick_parcels.py scout`) | **Dos ciclos verdes por año** en el NDVI (uno de invierno con riego y otro de verano). No dice de qué cultivo |
| `gto-norte-01` (28 ha) | Igual | Dos ciclos verdes por año, picos en marzo–abril y agosto–septiembre |

Los polígonos son propuestas derivadas de datos; falta el visto bueno de una
persona (`parcels/ver_parcelas.html`, HUMANO.md H-17).

## 1. La regla, bien leída

`AGENTS.md` regla 1 no dice "solo datos de la NASA". Dice: **nada inventado se
presenta como real**. Toda cifra viene de un dato observado, de un modelo con
métrica o de un supuesto declarado como supuesto.

- Los recursos de USDA, USGS, Oregon State, FAO y ESA **están en la lista oficial
  del reto**. Se pueden usar respetando las condiciones de uso de cada sitio.
- Lo que no se vale es elegir cultivos, cifras o rotaciones "de cabeza" y
  presentarlos como si vinieran de los datos.

Ahí está el problema real: el banco de 24 cultivos (`models/fao56_crop_bank.csv`)
y las plantillas de rotación (`TEMPLATES` en `backend/app/services/table_to_contract.py`)
se eligieron **antes** de mirar qué se siembra en la zona.

## 2. Lo que dicen los datos hoy

`python crop_census.py --fips 32011 --years 2021 2022 2023 2024`
(USDA CDL vía CropScape, condado de Eureka, NV, donde está Diamond Valley).
Acres por año; `*` = menos de 100 acres, poco confiable en CDL.

| CDL | Clase | 2021 | 2022 | 2023 | 2024 | ¿En el banco? |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 36 | Alfalfa | 31 506 | 28 969 | 27 961 | 22 222 | sí |
| 37 | Otro heno (no alfalfa) | 9 536 | 7 203 | 9 171 | 4 177 | **no** |
| 21 | Cebada | 2* | 609 | 786 | 0* | sí |
| 61 | Barbecho / inactivo | 543 | 372 | 589 | 107 | sí |
| 23 | Trigo de primavera | 0* | 405 | 475 | 298 | sí |
| 205 | Triticale | 88* | 353 | 184 | 0* | sí (como cobertura) |
| 24 | Trigo de invierno | 112 | 193 | 223 | 0* | sí |
| 1 | Maíz | 17* | 8* | 5* | 0* | sí |
| 43 | Papa | 3* | 7* | 0* | 0* | sí |

Lo que esto significa:

1. **En la zona se siembra alfalfa, otro heno y granos pequeños** (cebada,
   trigos, triticale), más barbecho. Nada más pasa de 100 acres.
2. **No hay rastro** de tomate, cebolla, chile, ajo, brócoli, girasol, canola,
   algodón, soya, frijol, garbanzo, lenteja ni sorgo. Hoy no hay base para
   sugerirlos en Diamond Valley.
3. **"Otro heno" (CDL 37) falta en el banco**, y es el segundo cultivo del condado.
4. La alfalfa bajó de 31 506 a 22 222 acres entre 2021 y 2024 (−29 %). Es un
   dato de condado; **no** dice por qué bajó. No hay que atribuirle causa sin
   evidencia.
5. Es por condado, no por valle: el paso siguiente es contar píxeles de CDL
   dentro de los polígonos del valle (`ee_export.py`, tabla `_cdl`).

**Conclusión:** tu sospecha es correcta para los cultivos y las rotaciones, no
para las fuentes. Las fuentes no-NASA de la lista sí valen; lo que hay que
cambiar es de dónde sale la lista de cultivos.

## 3. Recurso por recurso

Acceso: **GEE** = Google Earth Engine (cuenta con proyecto registrado);
**sin llave** = API pública; **llave** = registro gratuito.

### Núcleo: lo que el motor necesita para la compuerta de las 14:00

| Recurso | Qué aporta de verdad | Escala | Cómo se obtiene | Estado hoy | Uso en Field Shift |
| --- | --- | --- | --- | --- | --- |
| **NASA POWER** | Temperatura, rocío, viento, radiación y lluvia diarios desde 1981 | ~50 km | API REST, sin llave (`backend/app/sources/power.py`) | **Verificado hoy** (antes): responde en ~1.4 s | ET de referencia, heladas, calor. Contexto regional |
| **Landsat / HLS** | Reflectancia 30 m cada 2–3 días combinando Landsat y Sentinel-2 | 30 m | GEE (`NASA/HLS/HLSL30/v002`, `HLSS30`) o LP DAAC con Earthdata | Ids escritos, por verificar con `ee_coverage.py` | Tira de color, NDVI, NDMI, BSI, NDTI |
| **SMAP** | Humedad superficial y de raíces (L4), cada 3 h | 9 km | GEE (`NASA/SMAP/SPL4SMGP/...`) | Por verificar | Contexto regional y etiqueta del modelo 4 |
| **SRTM** | Elevación | 30 m | GEE (`USGS/SRTMGL1_003`) | Por verificar | Pendiente, presión para ET |
| **CDL (CropScape)** | **Qué cultivo hubo cada año en cada píxel** | 30 m, EE. UU. | GEE (`USDA/NASS/CDL`) para polígonos; API GetCDLStat sin llave para condados | **Verificado hoy**: condado 32011, 2021–2024 | **Lista de cultivos y rotaciones observadas**; etiquetas de los modelos 1–3 |
| **OpenET** | ET real por campo, mensual | 30 m, los 48 estados contiguos desde el 15 de diciembre de 2025 (antes 17 y luego 23 estados del oeste); la validación publicada en 2023 es del oeste | GEE (colección del conjunto) o API con **llave** | **Verificado hoy**: la API sin llave responde 403 | Agua real por cultivo; etiqueta del modelo 1 |
| **SSURGO / STATSGO2** | Textura, materia orgánica, agua disponible, grupo hidrológico, capas limitantes | Polígono de suelo | API Soil Data Access, **sin llave** | **Verificado hoy**: el punto de Diamond Valley es "Hamacer loamy fine sand, 0 a 2 %" | Perfil de suelo real en EE. UU. (reemplaza la pedotransferencia) |

### Apoyo: suma valor sin bloquear nada

| Recurso | Qué aporta de verdad | Escala | Cómo se obtiene | Estado hoy | Uso propuesto |
| --- | --- | --- | --- | --- | --- |
| **USDA NASS QuickStats** | Superficie, rendimiento y producción por condado y estado | Condado | API con **llave** gratuita | **Verificado hoy**: sin llave responde `unauthorized` | Confirmar con estadística oficial lo que CDL ve; rendimientos reales |
| **USGS NWIS** | Niveles de pozos y caudales medidos | Pozo | **API nueva** `api.waterdata.usgs.gov` (OGC), sin llave. La vieja de niveles se dio de baja en otoño de 2025 | **Verificado hoy**: el pozo 393032115580201 solo tiene mediciones de 1966; hay que buscar pozos con registro reciente | Tendencia real del acuífero como contexto de cuenca |
| **GPM IMERG** | Lluvia satelital | ~10 km | GEE (`NASA/GPM_L3/IMERG_MONTHLY_V07`) | Por verificar (ya está en `config.py`) | Comparar con la lluvia de POWER |
| **PRISM** | Clima mensual y normales de 30 años, con relieve | ~4 km, EE. UU. | GEE (`OREGONSTATE/PRISM/AN81m`) | Por verificar (ya está en `config.py`) | Clima más fino que POWER en valles de montaña |
| **ECOSTRESS** | Temperatura de superficie y ET | 70 m | AppEEARS (Earthdata Login, cola asíncrona) | No probado | Puntos calientes de estrés, si la cola responde a tiempo |
| **MODIS / VIIRS** | NDVI y EVI continuos desde 2000 | 250 m–1 km | GEE (`MODIS/061/MOD13Q1`, id por verificar) | No probado | Solo fenología regional; demasiado grueso para la parcela |
| **Sentinel-2** | 10–20 m con borde rojo | 10–20 m | Ya entra dentro de HLS S30; o GEE `COPERNICUS/S2_SR_HARMONIZED` | — | NDRE opcional, solo con S2 |
| **FAO GAEZ** | Aptitud agroclimática y rendimiento potencial por cultivo | ~9 km, global | Portal de datos de GAEZ (descarga de capas) | No probado | **El único recurso de la lista que dice qué cultivos son aptos en Querétaro** |
| **USDA AMS Market News** | Precios y demanda | Mercado regional | API MyMarketNews con **llave** | **Verificado hoy**: sin llave responde 403 | Restricción de comprador con dato, no con suposición |
| **Ag Data Commons** | Catálogo de conjuntos de datos y ensayos | Varía | Descarga por conjunto | No probado | Evidencia puntual para la ficha; no es una fuente continua |
| **Web Soil Survey** | Interfaz web de SSURGO | — | Mismo dato que Soil Data Access | — | Usar la API, no la web |

### Fuera, por decisión de `AGENTS.md` §4

NAIP, NLCD, NLDAS/GLDAS, ERA5, GEDI, LANDFIRE y CoCoRaHS están en la lista del
reto, pero el equipo los excluyó: redundan con POWER, SMAP o CDL, pesan mucho, o
no sirven para cultivos anuales. Varios sí están en GEE (por ejemplo ERA5-Land
mensual y NAIP), así que el motivo "es lento de descargar" no aplica a todos.
Reabrir alguno es decisión de Hanniel.

## 3b. Niveles por región: dónde hay mejores datos

La cobertura de cada recurso ya decide cuánto puede decir la herramienta en
cada lugar. No hace falta un análisis pesado para saberlo.

| Nivel | Dónde | Qué hay | Qué puede decir la herramienta |
| --- | --- | --- | --- |
| **1** | Zonas de riego del oeste de EE. UU. (NV, ID, UT, CA, AZ, CO…) | Todo: los recursos globales más CDL, OpenET con validación publicada, SSURGO, NWIS, PRISM, QuickStats y AMS | Qué se siembra, qué rotaciones hicieron campos parecidos, agua real por cultivo, suelo medido. **Aquí se entrena y se mide** (`region_mode: labeled`) |
| **2** | Resto de los 48 estados contiguos | Igual que el nivel 1, pero OpenET en el este es nuevo (desde dic. 2025) y sin la validación de 2023 | Casi lo mismo; la cifra de agua debe decir que OpenET no está validado ahí |
| **3** | Resto del mundo entre ~52° N y ~52° S | Solo globales: POWER, HLS, Sentinel-2, SMAP, SRTM, IMERG, ECOSTRESS, MODIS, SoilGrids y FAO GAEZ | Clima, vigor, suelo estimado y aptitud de cultivos. **No sabe qué se siembra**: lo declara el agricultor y los modelos van como experimentales (`unlabeled`). Querétaro está aquí |
| **4** | Latitudes altas (más de ~52° a 60°) | Pierde ECOSTRESS (52° N–S) y, más arriba, SRTM e IMERG | Muy poco; mejor no ofrecerlo |

Coberturas que lo definen: ECOSTRESS, 52° N a 52° S (órbita de la estación
espacial); CDL, SSURGO, QuickStats, AMS, NWIS y PRISM, solo EE. UU.; OpenET, 48
estados contiguos. Las cifras de SRTM (60° N a 56° S) e IMERG (60° N a 60° S)
hay que confirmarlas con `ee_coverage.py`.

Consecuencia: la herramienta **no se limita a un estado**. Funciona en cualquier
parcela del nivel 1 al 3, pero dice más o menos según el nivel, y la ficha de
evidencia lo explica en "información que falta". Diamond Valley es el caso de
demostración del nivel 1 y Querétaro el del nivel 3.

## 4. Cómo debe salir la lista de cultivos y las rotaciones

1. **Censo** por condado (`crop_census.py`, ya funciona) y después por valle
   (píxeles de CDL dentro de los polígonos, en GEE).
2. **Cultivos candidatos** = los que superan un umbral de superficie en la zona
   durante los últimos años. Umbral propuesto: 100 acres en al menos dos años.
   En Diamond Valley quedan: alfalfa, otro heno, cebada, trigo de primavera,
   trigo de invierno, triticale y barbecho.
3. **Rotaciones observadas**: en GEE, seguir cada píxel de CDL año con año y
   contar qué vino después de la alfalfa en los campos que la dejaron. Eso es
   "lo que hicieron campos parecidos" y reemplaza las plantillas inventadas.
4. **Agua por cultivo**: OpenET por píxel con el cultivo de CDL (es la etiqueta
   del modelo 1). FAO-56 queda solo como respaldo declarado, y solo para los
   cultivos candidatos.
5. **Comprador**: QuickStats (se siembra y se vende en el condado) y AMS
   (precio). Mientras no haya llave, lo declara el agricultor.

## 5. Querétaro y norte de Guanajuato

**Verificado en Earth Engine el 2026-11-14** con el proyecto `luca-497507` y
dos áreas de búsqueda (`parcels/mx_areas_busqueda.geojson`; son rectángulos
aproximados trazados por un agente, no parcelas):

- Hay HLS L30 (2013–2026), HLS S30 (2015–2026), Landsat 8 y 9, SMAP L4
  (2015–2026), IMERG mensual (1998–2025), SRTM y SoilGrids.
- No aplican CDL, OpenET ni PRISM.
- Para 36 meses completos conviene **2023–2025**; 2026 está incompleto.

**¿Dónde hay riego?** `ee_irrigated_scout.py` busca píxeles verdes en la
temporada seca (NDVI mediano de HLS mayor que 0.5 de marzo a mayo de 2025) que
además quedan casi sin vegetación en algún momento del año (percentil 10 anual
menor que 0.3), para descartar bosque. Los dos umbrales son supuestos.

| Área | Superficie | Verde en la seca | Verde en la seca y se cosecha (probable riego) | Cultivo según MODIS 2024 (500 m) |
| --- | ---: | ---: | ---: | ---: |
| San Juan del Río – Pedro Escobedo | 129 745 ha | 10 134 ha | 3 248 ha | 46 339 ha |
| Norte de Guanajuato | 993 083 ha | 37 495 ha | 5 160 ha | 144 185 ha |

- Sin el filtro de cosecha, las manchas más grandes del norte de Guanajuato
  caían en las sierras (bosque siempre verde). Con el filtro desaparecen.
- La cifra de riego es **un mínimo**. Un trigo o una cebada de invierno que ya
  se secó en abril queda por debajo del umbral de la mediana de marzo a mayo.
- La imagen de MODIS de 2025 existe en el catálogo pero viene vacía; por eso se
  usa 2024.
- Las 16 manchas candidatas más grandes están en
  `parcels/mx_manchas_candidatas_2025.geojson`. Sirven para que una persona
  elija dónde trazar parcelas. **No son parcelas ni etiquetas de cultivo.**

En la lista del reto **no hay ningún recurso que diga qué se siembra en
México**: CDL, OpenET, SSURGO, QuickStats, AMS, NWIS y PRISM son solo de EE. UU.

Con la lista se puede:
- clima (POWER, IMERG), satélite (HLS, Sentinel-2, SMAP) y relieve (SRTM);
- aptitud de cultivos con **FAO GAEZ**;
- con HLS, cuántos ciclos verdes tiene la parcela al año y si hay riego en la
  seca, sin saber de qué cultivo.

El cultivo lo **declara el agricultor**, como ya prevé el respaldo del modelo 3.
Usar estadística oficial mexicana (SIAP) sería salir de la lista: es decisión
del equipo y habría que declararlo en la página del proyecto.

## 6. Qué cambia en el código (propuesta, no aplicada)

| Pieza | Hoy | Debería |
| --- | --- | --- |
| `models/fao56_crop_bank.csv` | 24 cultivos elegidos a priori | Solo los candidatos del censo; agregar "otro heno" (CDL 37); el resto queda archivado, no se ofrece |
| `TEMPLATES` en `table_to_contract.py` | Plantillas supuestas | Rotaciones observadas en CDL del valle (paso 3) |
| Suelo en EE. UU. | Pedotransferencia sobre SoilGrids | SSURGO por Soil Data Access (verificado, sin llave) |
| Contexto de acuífero | Texto "sin información" | Niveles reales de pozos de NWIS |

Antes de tocar el banco o las plantillas hace falta el censo **por valle** y las
transiciones observadas; si no, se cambia una suposición por otra.
