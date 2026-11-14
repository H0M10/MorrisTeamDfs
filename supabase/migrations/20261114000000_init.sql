-- Field Shift: enlaces compartibles y revisión del técnico (AGENTS.md sección 7).
--
-- Reglas:
--   * Seguridad a nivel de fila activada y SIN políticas: nadie con la llave
--     anónima puede leer ni escribir las tablas directamente.
--   * Todo acceso pasa por cuatro funciones que piden el token del enlace.
--     Quien no conoce el token no puede leer nada ni listar evaluaciones.
--   * Sin datos personales: no hay columnas de nombre, teléfono ni correo.
--   * El control desde el teléfono usa Realtime Broadcast: no necesita tabla.

create table public.evaluations (
  id          uuid primary key default gen_random_uuid(),
  share_token text not null unique
              check (share_token ~ '^[A-Za-z0-9_-]{16,64}$'),
  input       jsonb not null default '{}'::jsonb,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

comment on table public.evaluations is
  'Evaluaciones compartidas por enlace. Sin datos personales.';
comment on column public.evaluations.share_token is
  'Token del enlace. Es la única credencial de lectura.';
comment on column public.evaluations.input is
  'Entrada de la evaluación: parcela y restricciones declaradas.';
comment on column public.evaluations.result is
  'Evaluación completa según /contracts/schema.json.';

create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  evaluation_id    uuid not null references public.evaluations (id) on delete cascade,
  verdict          text not null check (verdict in ('approve', 'correct', 'discard')),
  comments         text check (char_length(comments) <= 2000),
  corrected_limits jsonb,
  created_at       timestamptz not null default now()
);

comment on table public.reviews is
  'Revisión del técnico local sobre una evaluación compartida. Sin datos personales.';
comment on column public.reviews.verdict is
  'approve = aprueba, correct = corrige, discard = descarta.';
comment on column public.reviews.comments is
  'Texto libre del técnico. La interfaz debe pedir que no escriba nombres, teléfonos ni correos.';
comment on column public.reviews.corrected_limits is
  'Límites corregidos por el técnico, con la forma de constraints del contrato.';

create index reviews_evaluation_id_idx on public.reviews (evaluation_id, created_at);

-- Seguridad a nivel de fila: activada, sin políticas.
alter table public.evaluations enable row level security;
alter table public.reviews enable row level security;

revoke all on table public.evaluations from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funciones (security definer): el único camino de entrada.
-- ---------------------------------------------------------------------------

-- Guarda una evaluación. El token lo genera la API (secrets.token_urlsafe).
create function public.create_shared_evaluation(
  p_token  text,
  p_input  jsonb,
  p_result jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_result is null
     or jsonb_typeof(p_result) <> 'object'
     or not (p_result ? 'contract_version' and p_result ? 'data_status' and p_result ? 'strategies')
  then
    raise exception 'result no es una evaluación del contrato' using errcode = '22023';
  end if;
  if octet_length(p_result::text) > 1500000 or octet_length(coalesce(p_input, '{}'::jsonb)::text) > 50000 then
    raise exception 'la evaluación es demasiado grande' using errcode = '22023';
  end if;

  insert into public.evaluations (share_token, input, result)
  values (p_token, coalesce(p_input, '{}'::jsonb), p_result);

  return p_token;
end;
$$;

-- Lee una evaluación. Devuelve cero filas si el token no existe.
create function public.get_shared_evaluation(p_token text)
returns table (share_token text, input jsonb, result jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.share_token, e.input, e.result, e.created_at
  from public.evaluations e
  where e.share_token = p_token;
$$;

-- El técnico deja su revisión sobre una evaluación compartida.
create function public.submit_review(
  p_token            text,
  p_verdict          text,
  p_comments         text default null,
  p_corrected_limits jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evaluation_id uuid;
  v_review_id     uuid;
begin
  select e.id into v_evaluation_id
  from public.evaluations e
  where e.share_token = p_token;

  if v_evaluation_id is null then
    raise exception 'no existe una evaluación con ese token' using errcode = 'P0002';
  end if;
  if octet_length(coalesce(p_corrected_limits, '{}'::jsonb)::text) > 20000 then
    raise exception 'los límites corregidos son demasiado grandes' using errcode = '22023';
  end if;

  insert into public.reviews (evaluation_id, verdict, comments, corrected_limits)
  values (v_evaluation_id, p_verdict, nullif(btrim(p_comments), ''), p_corrected_limits)
  returning id into v_review_id;

  return v_review_id;
end;
$$;

-- Lee las revisiones de una evaluación, de la más antigua a la más reciente.
create function public.get_reviews(p_token text)
returns table (
  id               uuid,
  verdict          text,
  comments         text,
  corrected_limits jsonb,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.verdict, r.comments, r.corrected_limits, r.created_at
  from public.reviews r
  join public.evaluations e on e.id = r.evaluation_id
  where e.share_token = p_token
  order by r.created_at;
$$;

revoke execute on function public.create_shared_evaluation(text, jsonb, jsonb) from public;
revoke execute on function public.get_shared_evaluation(text) from public;
revoke execute on function public.submit_review(text, text, text, jsonb) from public;
revoke execute on function public.get_reviews(text) from public;

grant execute on function public.create_shared_evaluation(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.get_shared_evaluation(text) to anon, authenticated;
grant execute on function public.submit_review(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.get_reviews(text) to anon, authenticated;
