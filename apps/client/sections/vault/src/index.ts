/**
 * Sección Vault (P9, §14.9): documentos personales. Solo METADATOS — el binario
 * (PDF/foto) vive en el backend de blobs (decisión #10) y nunca en estas queries.
 * RLS de un solo usuario: cada quien ve y gestiona los suyos.
 */

import type { MatrixClient } from "@matrix/client-shared";
import type { Database } from "@matrix/db/types";

export type VaultDocument = Database["vault"]["Tables"]["documents"]["Row"];
export type VaultDocumentInsert = Database["vault"]["Tables"]["documents"]["Insert"];
export type DocType = VaultDocument["doc_type"];

export const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "identity", label: "Identidad" },
  { value: "immigration", label: "Inmigración" },
  { value: "health", label: "Salud" },
  { value: "insurance", label: "Seguro" },
  { value: "contract", label: "Contrato" },
  { value: "tax", label: "Impuestos" },
  { value: "other", label: "Otro" },
];

const vaultDb = (client: MatrixClient) => client.schema("vault");

export async function fetchDocuments(client: MatrixClient): Promise<VaultDocument[]> {
  const { data, error } = await vaultDb(client)
    .from("documents")
    .select("*")
    .eq("status", "active")
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`vault.documents: ${error.message}`);
  return data ?? [];
}

export async function addDocument(
  client: MatrixClient,
  doc: VaultDocumentInsert
): Promise<void> {
  const { error } = await vaultDb(client).from("documents").insert(doc);
  if (error) throw new Error(`alta documento: ${error.message}`);
}

export async function archiveDocument(
  client: MatrixClient,
  id: string
): Promise<void> {
  const { error } = await vaultDb(client)
    .from("documents")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw new Error(`archivar: ${error.message}`);
}

export interface ExpiryInfo {
  daysLeft: number | null;
  soon: boolean; // <= 90 días
  expired: boolean;
}

export function expiryInfo(doc: VaultDocument, today = new Date()): ExpiryInfo {
  if (!doc.expiry_date) return { daysLeft: null, soon: false, expired: false };
  const exp = new Date(`${doc.expiry_date}T12:00:00`);
  const daysLeft = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
  return { daysLeft, soon: daysLeft <= 90 && daysLeft >= 0, expired: daysLeft < 0 };
}
