/**
 * Tab Chat (C3, §14.6): hablar con saxa sin Telegram.
 * Envía por insert (RLS) y recibe por Realtime; mismo cerebro que el grupo.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  approvalMetadata,
  fetchChatHistory,
  sendChatMessage,
  subscribeChat,
  type ChatMessage,
} from "@matrix/client-shared";
import { supabase } from "../supabase";

/** Tarjeta de aprobación HITL: captura + Aprobar/Rechazar (§8.2). */
function ApprovalCard({
  m,
  onDecide,
}: {
  m: ChatMessage;
  onDecide: (cmd: string) => void;
}) {
  const meta = approvalMetadata(m)!;
  const shortId = meta.approval_id.slice(0, 8);
  return (
    <View style={styles.approvalCard}>
      <Text style={styles.approvalText}>{m.content}</Text>
      {meta.image_url ? (
        <Image
          source={{ uri: meta.image_url }}
          style={styles.approvalImage}
          resizeMode="contain"
        />
      ) : (
        <Text style={styles.approvalNoImage}>
          (captura disponible en el EQR6)
        </Text>
      )}
      <View style={styles.approvalButtons}>
        <TouchableOpacity
          style={[styles.approveBtn, styles.rejectBtn]}
          onPress={() => onDecide(`/rechazar ${shortId}`)}
        >
          <Text style={styles.rejectText}>Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => onDecide(`/aprobar ${shortId}`)}
        >
          <Text style={styles.approveText}>Aprobar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === "user";
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={mine ? styles.mineText : styles.theirsText}>{m.content}</Text>
      {m.status === "pending" || m.status === "processing" ? (
        <ActivityIndicator size="small" style={styles.spinner} />
      ) : null}
    </View>
  );
}

export function ChatScreen({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setMessages(await fetchChatHistory(supabase));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = subscribeChat(supabase, userId, () => void load());
    return unsubscribe;
  }, [load, userId]);

  const sendText = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      try {
        await sendChatMessage(supabase, userId, trimmed);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [userId]
  );

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await sendText(content);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) =>
          approvalMetadata(item) ? (
            <ApprovalCard m={item} onDecide={(cmd) => void sendText(cmd)} />
          ) : (
            <Bubble m={item} />
          )
        }
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Habla con saxa: mercado, tus documentos, lo que necesites.
          </Text>
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Mensaje a saxa…"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 12, gap: 8 },
  bubble: { maxWidth: "85%", borderRadius: 14, padding: 12 },
  mine: { alignSelf: "flex-end", backgroundColor: "#111" },
  theirs: { alignSelf: "flex-start", backgroundColor: "#ececec" },
  mineText: { color: "#fff", fontSize: 15 },
  theirsText: { color: "#111", fontSize: 15 },
  spinner: { marginTop: 6, alignSelf: "flex-start" },
  approvalCard: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#d6b400",
    backgroundColor: "#fffbe6",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  approvalText: { fontSize: 14, color: "#111" },
  approvalImage: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  approvalNoImage: { fontSize: 12, color: "#888", fontStyle: "italic" },
  approvalButtons: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  approveBtn: {
    backgroundColor: "#0a7f3f",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  approveText: { color: "#fff", fontWeight: "700" },
  rejectBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#c0262d" },
  rejectText: { color: "#c0262d", fontWeight: "700" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 110,
  },
  sendBtn: {
    backgroundColor: "#111",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendText: { color: "#fff", fontSize: 16 },
  empty: { textAlign: "center", color: "#666", marginTop: 40, paddingHorizontal: 24 },
  error: { color: "#c0262d", padding: 10 },
});
