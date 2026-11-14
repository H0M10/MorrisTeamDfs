# Plan de datos — qué aporta cada recurso del reto y cómo se obtiene

Escrito el 2026-11-14 por Claude para Hanniel y Checo (dupla Backend/Datos).
Las marcas **Verificado hoy** son llamadas reales hechas ese día desde la laptop;
lo demás sale de la documentación de cada servicio y hay que comprobarlo con
`ee_coverage.py` o con una llamada real antes de depender de ello.

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
| **OpenET** | ET real por campo, mensual | 30 m, oeste de EE. UU. | GEE (colección del conjunto) o API con **llave** | **Verificado hoy**: la API sin llave responde 403 | Agua real por cultivo; etiqueta del modelo 1 |
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

## 5. Querétaro

En la lista del reto **no hay ningún recurso que diga qué se siembra en
México**: CDL, OpenET, SSURGO, QuickStats y AMS son solo de EE. UU.

Con la lista se puede:
- clima (POWER, IMERG), satélite (HLS, Sentinel-2, SMAP), relieve (SRTM) y
  suelo global (SoilGrids);
- aptitud de cultivos con **FAO GAEZ**;
- ver con HLS cuántos ciclos verdes tiene la parcela al año, sin saber de qué cultivo.

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
