import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER-SIDE ONLY. Bypasses RLS entirely,
 * so this must never be imported into any "use client" file or otherwise
 * exposed to the browser (there's no NEXT_PUBLIC_ prefix on the key it
 * reads, specifically so it can't leak into client bundles).
 *
 * Used exclusively by the Telegram webhook route: Telegram calls that
 * route directly over HTTP with no Supabase user session attached, so it
 * needs elevated access to look up which app user a given Telegram chat
 * is linked to, and to insert notes on that user's behalf.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
