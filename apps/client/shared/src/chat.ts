/**
 * Canal de chat C3 (§14.6): helpers compartidos web/móvil.
 * Transporte v1: insertar en chat.messages + suscripción Realtime.
 */

import type { Database } from "@matrix/db/types";
import type { MatrixClient } from "./supabase";

export type ChatMessage = Database["chat"]["Tables"]["messages"]["Row"];

/** Forma de chat.messages.metadata cuando es una tarjeta de aprobación (HITL). */
export interface ApprovalMetadata {
  kind: "approval";
  approval_id: string;
  action_kind: string;
  image_url?: string | null;
}

export function approvalMetadata(m: ChatMessage): ApprovalMetadata | null {
  const meta = m.metadata as { kind?: string } | null;
  return meta && meta.kind === "approval" ? (meta as unknown as ApprovalMetadata) : null;
}

const chatDb = (client: MatrixClient) => client.schema("chat");

export async function fetchChatHistory(
  client: MatrixClient,
  limit = 50
): Promise<ChatMessage[]> {
  const { data, error } = await chatDb(client)
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`chat.messages: ${error.message}`);
  return (data ?? []).reverse();
}

export async function sendChatMessage(
  client: MatrixClient,
  userId: string,
  content: string
): Promise<void> {
  const { error } = await chatDb(client).from("messages").insert({
    user_id: userId,
    role: "user",
    content,
    status: "pending",
  });
  if (error) throw new Error(`enviar mensaje: ${error.message}`);
}

/** Suscripción a mensajes nuevos del usuario (Realtime). Devuelve unsubscribe. */
export function subscribeChat(
  client: MatrixClient,
  userId: string,
  onChange: () => void
): () => void {
  const channel = client
    .channel("chat_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "chat",
        table: "messages",
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
