// Cliente de Supabase para tiempo real (/remote) y revisiones (/tool).
// Se carga solo cuando alguien lo pide, y devuelve null si faltan las
// variables: sin Supabase, guardar y compartir se desactivan y lo demás sigue.
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: Promise<SupabaseClient | null> | undefined;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export function getSupabase(): Promise<SupabaseClient | null> {
  client ??= (async () => {
    if (!supabaseUrl || !supabaseKey) return null;
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  })();
  return client;
}

/** Nombre del canal de Realtime Broadcast para una sesión de control remoto. */
export const remoteChannel = (sessionId: string) => `remote:${sessionId}`;
