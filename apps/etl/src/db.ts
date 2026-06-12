import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@matrix/db/types";

/**
 * Cliente service_role contra el Kong del stack self-host, con el schema
 * `market` por defecto (todas las tablas que escribe el ETL viven ahí).
 * Solo para jobs de servidor; jamás en código cliente.
 *
 * Env: SUPABASE_URL (p. ej. http://kong:8000 dentro del compose,
 * http://localhost:8000 desde el host) + SERVICE_ROLE_KEY.
 */
export type MarketDbClient = SupabaseClient<Database, "market">;

export function createServiceRoleClient(): MarketDbClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SERVICE_ROLE_KEY are required");
  }
  return createClient<Database, "market">(url, key, {
    db: { schema: "market" },
    auth: { persistSession: false },
  });
}
