# /data-pipeline — Datos

Dueño: Persona 1 (Datos).
Entrega: guiones de extracción y cruce (Earth Engine, NASA POWER) que corren
**fuera de las laptops** y dejan una tabla mensual por parcela en GeoParquet.

> **Estado:** los guiones están escritos y su sintaxis revisada, pero **nunca
> se han ejecutado contra Earth Engine** (hace falta la cuenta). Los
> identificadores de colección de `config.py` se escribieron de memoria: el
> paso 1 existe para comprobarlos.

## Los tres pasos

| Paso | Guion | Qué hace | Memoria |
| --- | --- | --- | --- |
| 1 | `ee_coverage.py` | Imprime qué años cubre cada colección sobre tus parcelas. No exporta | < 1 GB |
| 2 | `ee_export.py` | Lanza las exportaciones a Google Drive (CSV). El cruce corre en Earth Engine | < 1 GB |
| 3 | `build_table.py` | Junta los CSV con NASA POWER y escribe GeoParquet | < 1 GB con decenas de parcelas |

La forma recomendada es el cuaderno `notebooks/field_shift_pipeline.ipynb` en
Colab, que corre los tres en orden. Comandos sueltos y cuentas: `HUMANO.md` H-11.

```bash
pip install -r requirements.txt
earthengine authenticate
python ee_coverage.py --parcels parcels/diamond_valley.geojson --project <proyecto-ee>
python ee_export.py   --parcels parcels/diamond_valley.geojson --start-year <A> --end-year <B> --project <proyecto-ee> --wait
python build_table.py --parcels parcels/diamond_valley.geojson --exports <carpeta-con-los-csv> --out exports/diamond_valley.parquet
```

Para Querétaro (sin CDL ni OpenET) agrega `--unlabeled` a los pasos 1 y 2.

## La tabla que sale

Una fila por parcela y mes.

| Columna | Fuente | Escala |
| --- | --- | --- |
| `parcel_id`, `valley`, `month`, `year`, `month_num` | GeoJSON de parcelas | |
| `red`, `green`, `blue`, `hls_color_hex`, `hls_n_images` | HLS L30 y S30, mediana mensual sin nubes | 30 m |
| `ndvi`, `ndmi`, `bsi`, `ndti` | HLS | 30 m |
| `openet_et_mm` | OpenET, conjunto mensual (solo oeste de EE. UU.) | 30 m |
| `cdl_code`, `crop_group`, `prev_crop_group` | USDA CDL (solo EE. UU.) | 30 m |
| `smap_sm_surface`, `smap_sm_rootzone` | SMAP L4 | 9 km: contexto regional |
| `et0_mm`, `rain_mm`, `tmax_c`, `tmin_c`, `frost_days`, `heat_days` | NASA POWER | cerca de 50 km: contexto regional |
| `clay_pct`, `sand_pct`, `silt_pct`, `soc_gkg` | SoilGrids, capa de 0 a 5 cm | 250 m |
| `elevation_m`, `slope_pct` | SRTM | 30 m |
| `geometry` | Polígono de la parcela | |

Un mes sin imágenes sale vacío (NaN), nunca rellenado. `build_table.py` imprime
el porcentaje de vacíos por columna.

## Parcelas

`parcels/*.geojson`: cada parcela con `parcel_id` y `valley`. El valle es lo
que usa `/models` para separar entrenamiento y prueba, así que debe ser el
mismo texto para todas las parcelas de una zona.

`parcels/diamond_valley.geojson` trae **un rectángulo de ejemplo** copiado del
fixture. Hay que reemplazarlo por pivotes reales (`HUMANO.md` H-11).

## Qué falta (en orden)

1. Correr `ee_coverage.py` y corregir en `config.py` lo que no exista.
2. Dibujar las parcelas reales de Diamond Valley y exportar sus 36 meses.
3. Elegir dos o tres zonas parecidas de Nevada, Idaho y Utah y exportarlas
   (un GeoJSON por zona o uno solo con `valley` distinto).
4. Querétaro, cuando exista el polígono, con `--unlabeled`.
5. Capacidad de agua disponible del suelo (`awc_mm_m`): no está en la tabla.
   Sale de SSURGO (EE. UU.) o de una función de pedotransferencia sobre
   SoilGrids; decidir cuál y declararlo.
6. Convertir la tabla de una parcela al formato del contrato para la API.

## Reglas

- Nada de datos crudos en la laptop ni en el repositorio. `exports/` está en `.gitignore`.
- No se usan GEDI, LANDFIRE, NAIP, NLCD, CoCoRaHS, NLDAS ni ERA5.
- NDRE no se calcula con Landsat. CAI no se calcula.
- SMAP y POWER son contexto regional: nunca se presentan como de la parcela.
