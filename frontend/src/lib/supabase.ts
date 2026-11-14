// Cliente de Supabase para tiempo real (/remote) y revisiones (/tool).
// Se carga solo cuando alguien lo pide, y devuelve null si faltan las
// variables: sin Supabase, guardar y compartir se desactivan y lo demás sigue.
import type { SupabaseClient } from "@supabase/supabase-js";

let client: Promise<SupabaseClient | null> | undefined;

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function getSupabase(): Promise<SupabaseClient | null> {
  client ??= (async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key, { auth: { persistSession: false } });
  })();
  return client;
}

/** Nombre del canal de Realtime Broadcast para una sesión de control remoto. */
export const remoteChannel = (sessionId: string) => `remote:${sessionId}`;
