# /remote — El teléfono como control

Dueño: Alexis (`@alexishal8` — Control remoto, congelado como esqueleto por recorte de equipo de 4).
Entrega: vista móvil conectada por QR y Supabase Realtime Broadcast para que el
juez controle la pantalla desde su teléfono.

## Qué hay hoy

`page.tsx` lee la evaluación y pinta en crudo los meses y las rotaciones que el
control podrá elegir. Dice si Supabase está configurado. No se conecta a nada.

## Qué construir, en orden

Es el extra 5: el último de la lista y el primero que se corta.

1. En `/showcase`: generar un id de sesión al azar y mostrar un QR hacia
   `/remote?s=<id>`.
2. Aquí: leer `s`, y con `getSupabase()` y `remoteChannel(id)` de `@/lib/supabase`
   abrir el canal y enviar eventos de Broadcast.
3. En `/showcase`: escuchar el mismo canal y aplicar los eventos.
4. Botones grandes (44 px o más) para mes anterior/siguiente y cambio de rotación.

Eventos propuestos en `/supabase/README.md`. Realtime Broadcast no usa tabla.

## Reglas

- Por el canal solo viajan órdenes de navegación, nunca datos de la evaluación.
- Si Supabase no está configurado o falla, la página lo dice y `/showcase`
  sigue con teclado.
- Bloqueado hasta que exista el proyecto de Supabase (`HUMANO.md` H-06).
