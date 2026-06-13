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
import { ScreenBackground, Surface, ThemeText } from "../theme/components";
import { useTheme } from "../theme/ThemeProvider";
import { useAudioMode } from "../voice/AudioModeProvider";
import { speak, stopSpeaking } from "../voice/speech";
import { useDictation } from "../voice/useDictation";

const APPROVE = "#2ecc71";

/** Tarjeta de aprobación HITL: captura + Aprobar/Rechazar (§8.2). */
function ApprovalCard({
  m,
  onDecide,
}: {
  m: ChatMessage;
  onDecide: (cmd: string) => void;
}) {
  const { theme } = useTheme();
  const meta = approvalMetadata(m)!;
  const shortId = meta.approval_id.slice(0, 8);
  return (
    <Surface style={styles.approvalCard} contentStyle={styles.approvalInner}>
      <ThemeText style={styles.approvalText}>{m.content}</ThemeText>
      {meta.image_url ? (
        <Image source={{ uri: meta.image_url }} style={styles.approvalImage} resizeMode="contain" />
      ) : (
        <ThemeText muted style={styles.approvalNoImage}>
          (captura disponible en el EQR6)
        </ThemeText>
      )}
      <View style={styles.approvalButtons}>
        <TouchableOpacity
          style={[styles.btn, { borderWidth: 1, borderColor: theme.danger }]}
          onPress={() => onDecide(`/rechazar ${shortId}`)}
        >
          <Text style={[styles.btnText, { color: theme.danger, fontFamily: theme.fontFamily }]}>
            Rechazar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: APPROVE }]}
          onPress={() => onDecide(`/aprobar ${shortId}`)}
        >
          <Text style={[styles.btnText, { color: "#04140a", fontFamily: theme.fontFamily }]}>
            Aprobar
          </Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const { theme } = useTheme();
  const mine = m.role === "user";
  return (
    <View
      style={[
        styles.bubble,
        mine
          ? { alignSelf: "flex-end", backgroundColor: theme.primary }
          : { alignSelf: "flex-start", backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.surfaceBorder },
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          { color: mine ? theme.primaryText : theme.text, fontFamily: theme.fontFamily },
        ]}
      >
        {m.content}
      </Text>
      {m.status === "pending" || m.status === "processing" ? (
        <ActivityIndicator size="small" color={mine ? theme.primaryText : theme.text} style={styles.spinner} />
      ) : null}
    </View>
  );
}

export function ChatScreen({ userId }: { userId: string }) {
  const { theme } = useTheme();
  const { audioMode, toggle } = useAudioMode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const lastSpokenId = useRef<string | null>(null);

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

  // Modo audio: lee en voz alta la última respuesta de saxa (una sola vez).
  useEffect(() => {
    if (!audioMode || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (
      last.role === "assistant" &&
      last.status === "done" &&
      last.id !== lastSpokenId.current
    ) {
      lastSpokenId.current = last.id;
      speak(last.content);
    }
  }, [messages, audioMode]);

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

  const dictation = useDictation((text) => {
    // Voz reconocida → la mandamos directamente a saxa.
    void sendText(text);
  });

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await sendText(content);
  }

  function onMicPress() {
    if (dictation.listening) dictation.stop();
    else dictation.start();
  }

  function onAudioToggle() {
    if (audioMode) stopSpeaking();
    toggle();
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={onAudioToggle}
            style={[
              styles.audioToggle,
              {
                borderColor: audioMode ? theme.primary : theme.surfaceBorder,
                backgroundColor: audioMode ? theme.primary : "transparent",
              },
            ]}
          >
            <Text style={{ color: audioMode ? theme.primaryText : theme.textMuted, fontFamily: theme.fontFamily, fontSize: 13 }}>
              {audioMode ? "🔊 Voz activada" : "🔈 Modo audio"}
            </Text>
          </TouchableOpacity>
        </View>
        {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
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
            <ThemeText muted style={styles.empty}>
              Habla con saxa: mercado, tus documentos, lo que necesites.
            </ThemeText>
          }
        />
        <View style={[styles.inputRow, { borderColor: theme.surfaceBorder }]}>
          <TouchableOpacity
            style={[
              styles.micBtn,
              {
                backgroundColor: dictation.listening ? theme.danger : "transparent",
                borderColor: dictation.listening ? theme.danger : theme.inputBorder,
              },
            ]}
            onPress={onMicPress}
          >
            <Text style={{ fontSize: 18 }}>{dictation.listening ? "⏺" : "🎤"}</Text>
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text, fontFamily: theme.fontFamily },
            ]}
            placeholder={dictation.listening ? "Escuchando…" : "Mensaje a saxa…"}
            placeholderTextColor={theme.placeholder}
            value={dictation.listening && dictation.partial ? dictation.partial : draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
            editable={!dictation.listening}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.primary }]} onPress={send}>
            <Text style={{ color: theme.primaryText, fontSize: 16 }}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { alignItems: "flex-end", paddingTop: 64, paddingHorizontal: 12, paddingBottom: 4 },
  audioToggle: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  micBtn: {
    borderWidth: 1,
    borderRadius: 18,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 12, paddingTop: 8, gap: 8 },
  bubble: { maxWidth: "85%", borderRadius: 14, padding: 12 },
  bubbleText: { fontSize: 15 },
  spinner: { marginTop: 6, alignSelf: "flex-start" },
  approvalCard: { alignSelf: "stretch" },
  approvalInner: { padding: 14, gap: 10 },
  approvalText: { fontSize: 14 },
  approvalImage: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  approvalNoImage: { fontSize: 12, fontStyle: "italic" },
  approvalButtons: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  btn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  btnText: { fontWeight: "700" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    paddingBottom: 24,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 110,
  },
  sendBtn: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  empty: { textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  error: { padding: 10 },
});
