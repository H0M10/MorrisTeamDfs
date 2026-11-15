# Ficha del modelo: 5. Secuencias de cultivo

> **Estado: ENTRENADO, MEDIDO Y EN USO (2026-11-15).** Artefacto en `backend/artifacts/model_5_crop_sequence/` (`transitions.json` + `metrics.json`). Aprobado por Hanniel como quinto modelo, fuera del contrato congelado: su métrica va aquí y en la fuente de cada rotación que propone.

## Qué hace

Aprende qué siembran los agricultores después de qué, en campos de riego parecidos. Con eso propone rotaciones de 3 años que de verdad se hacen. Es **observacional**: "lo que hacen campos parecidos", no una receta óptima ni una promesa de rendimiento.

## Datos

- **Etiqueta:** grupo de cultivo de USDA CDL de cada año y campo (alfalfa, grano pequeño, maíz, barbecho u otro).
- **Tabla:** `data-pipeline/exports/train_fields.parquet`, 1 138 campos en 6 valles de riego, CDL de 2015 a 2024.
- **Algoritmo:** cadena de Markov de segundo orden (el año depende de los dos anteriores) con respaldo a primer orden cuando una pareja de años tiene menos de 5 casos, y suavizado de Laplace. Es conteo: se entrena en segundos en CPU.

## Partición

- **Por valle:** entrenado con 8 352 transiciones de `lovelock_nv`, `mason_valley_nv`, `millard_ut`, `sevier_ut` y `snake_river_id`; medido en `diamond_valley_nv` (752 años-campo, nunca visto).
- **Último año fuera:** 2024 de los valles de entrenamiento como segunda prueba.

## Métrica contra la línea base

| Diamond Valley (752 años-campo) | Modelo 5 | Línea base: repetir el cultivo del año pasado |
| --- | ---: | ---: |
| Log-verosimilitud por año (más alto es mejor) | **−0.785** | −0.938 |
| Exactitud del cultivo más probable | 78.1 % | **79.5 %** |

- **¿Gana?** En lo que se usa, sí: sus probabilidades describen mejor lo que pasa (−0.785 contra −0.938), y con ellas se ordenan las rotaciones por qué tan comunes son. **Si hay que adivinar un solo cultivo, pierde por poco** contra repetir el del año pasado, porque en Diamond Valley casi todo sigue en alfalfa. Se reportan las dos cifras.
- Último año de los valles de entrenamiento: 44.0 % contra 44.4 % (empate; 2024 trae muchos cambios de clase "otro").

## Cómo se usa en la herramienta

`backend/app/services/rotations.py`:

1. Toma los dos últimos años del campo y calcula la probabilidad de cada secuencia de 3 años de grupos de cultivo; se queda con las 12 más comunes (al menos 0.5 %).
2. **Reglas:** al menos dos años con un cultivo que se vende, distinta de la rotación actual, y solo cultivos con comprador en la zona.
3. Se juntan con el catálogo del equipo. "Menos agua" elige la de menor agua predicha por el **Modelo 1**; "más suelo", la de más meses de cultivo vivo.
4. Cada año se vuelve 12 meses con un calendario declarado: alfalfa de abril a octubre, grano de primavera de abril a julio, maíz de mayo a octubre.

## Límites

- Observacional: lo que hacen los agricultores depende de precios, contratos y agua que no vemos.
- Solo 4 grupos de cultivo; papa, frijol u hortalizas caen en "otro" y no se proponen.
- Solo donde hay USDA CDL (EE. UU.).

## Cómo se reproduce

```bash
python models/model_5_crop_sequence/train.py --table data-pipeline/exports/train_fields.parquet --test-valley diamond_valley_nv
```

Fecha de entrenamiento: 2026-11-15. Quién lo corrió: `@H0M10` / Claude Code. Dónde: CPU local (conteo, segundos).
