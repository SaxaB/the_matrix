/**
 * Cliente Supabase multiplataforma (web y React Native).
 *
 * No toca APIs de plataforma: el llamante inyecta el storage de sesión
 * (AsyncStorage en RN; en web el default de supabase-js ya vale). Las apps
 * Next con SSR siguen usando @supabase/ssr — este factory es para clientes
 * "browser-like" (RN, SPA, hooks de Realtime).
 */

import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import type { Database } from "@matrix/db/types";

export type MatrixClient = SupabaseClient<Database>;
export type FinanceClient = ReturnType<MatrixClient["schema"]>;

export interface ClientOptions {
  /** Storage de sesión (RN: AsyncStorage). Omitir en web. */
  storage?: SupportedStorage;
}

export function createMatrixClient(
  url: string,
  anonKey: string,
  options: ClientOptions = {}
): MatrixClient {
  if (!url || !anonKey) {
    throw new Error("Faltan SUPABASE_URL / ANON_KEY para crear el cliente");
  }
  return createClient<Database>(url, anonKey, {
    auth: {
      ...(options.storage ? { storage: options.storage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/** Atajos tipados a los schemas por dominio (diseño §14.4.3). */
export const financeDb = (client: MatrixClient) => client.schema("finance");
export const marketDb = (client: MatrixClient) => client.schema("market");
