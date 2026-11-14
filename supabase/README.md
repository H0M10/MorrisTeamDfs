# /supabase — Base de datos

Dueño: Hanniel (`@H0M10` — Motor y API).
Entrega: migraciones SQL y acceso por token para evaluaciones compartibles y
revisiones del técnico, sin datos personales.

## Qué hay

`migrations/20261114000000_init.sql` crea:

| Objeto | Para qué |
| --- | --- |
| `evaluations` | id, `share_token`, entrada y resultado en JSON, fecha |
| `reviews` | id, evaluación, veredicto (`approve`, `correct`, `discard`), comentarios, límites corregidos, fecha |
| `create_shared_evaluation(p_token, p_input, p_result)` | Guarda una evaluación. La llama la API en `POST /api/v1/share` |
| `get_shared_evaluation(p_token)` | Lee una evaluación. La llama la API en `GET /api/v1/share/{token}` |
| `submit_review(p_token, p_verdict, p_comments, p_corrected_limits)` | El técnico deja su revisión. La llama `/tool` con supabase-js |
| `get_reviews(p_token)` | Lee las revisiones de una evaluación |

## Cómo se protege

- Las dos tablas tienen la seguridad a nivel de fila **activada y sin
  políticas**. Con la llave anónima no se puede leer, escribir ni listar nada
  directamente.
- Todo pasa por las cuatro funciones, que piden el token del enlace. Quien no
  conoce el token no lee nada.
- No hay cuentas de usuario ni columnas de nombre, teléfono o correo. El campo
  `comments` es texto libre: la interfaz debe pedirle al técnico que no escriba
  datos personales.
- Ni la API ni el frontend usan la llave `service_role`. Esa llave no se copia
  a ningún lado.

Desde el frontend:

```ts
await supabase.rpc("submit_review", {
  p_token: token,
  p_verdict: "correct",
  p_comments: "El pozo no da más de 500 mm por año.",
  p_corrected_limits: { max_water_mm_year: 500 },
});
const { data } = await supabase.rpc("get_reviews", { p_token: token });
```

## Teléfono como control (`/remote`)

Usa Realtime Broadcast: **sin tabla** y sin migración.

- Canal: `remote:<id-de-sesión>`. La pantalla grande genera el id al azar y lo
  pone en el código QR.
- Eventos propuestos (los ajusta la persona 5): `month` (`{ index: 0..35 }`),
  `strategy` (`{ id: "current" | "less_water" | "more_soil" }`), `rotate`
  (`{ deg: number }`).
- Por el canal solo viajan órdenes de navegación. Nunca datos de la evaluación.

## Si Supabase no responde

La API devuelve 503 `share_unavailable` y lo demás sigue funcionando. La
interfaz debe desactivar "guardar" y "compartir" y dejar la impresión.

## Estado

La migración pasó el analizador sintáctico de Postgres (`pglast`), pero **no se
ha ejecutado contra una base real**: hace falta el proyecto de Supabase. Los
pasos están en `HUMANO.md` (H-06).
