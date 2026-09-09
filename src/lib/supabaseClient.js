import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let clientInstance = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://acxkuejfngplexowytzg.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_dvD1d-8CMzS5Y-lny7OiNQ_wf8pIC9c";

  if (typeof window === "undefined") {
    return createSupabaseClient(url, key);
  }

  if (!clientInstance) {
    clientInstance = createSupabaseClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}
