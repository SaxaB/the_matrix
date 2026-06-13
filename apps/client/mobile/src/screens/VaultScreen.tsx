/**
 * Tab Vault (P9, §14.9): tus documentos importantes.
 * Gestiona METADATOS (título, tipo, titular, caducidad…) con recordatorio de
 * caducidades. El fichero en sí (PDF/foto) se adjuntará cuando esté decidido el
 * backend de blobs (#10); aquí vive lo que permite "¿cuándo caduca mi pasaporte?".
 */

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  addDocument,
  DOC_TYPES,
  expiryInfo,
  fetchDocuments,
  type DocType,
  type VaultDocument,
} from "@matrix/section-vault";
import { supabase } from "../supabase";
import { ScreenBackground, Surface, ThemeText } from "../theme/components";
import { useTheme } from "../theme/ThemeProvider";

const OK = "#2ecc71";
const SOON = "#e3a008";

function ExpiryBadge({ doc }: { doc: VaultDocument }) {
  const { theme } = useTheme();
  const info = expiryInfo(doc);
  if (info.daysLeft == null) return null;
  const color = info.expired ? theme.danger : info.soon ? SOON : OK;
  const text = info.expired
    ? `caducó hace ${-info.daysLeft}d`
    : `caduca en ${info.daysLeft}d`;
  return <Text style={[styles.badge, { color, fontFamily: theme.fontFamily }]}>{text}</Text>;
}

function AddDocModal({
  userId,
  visible,
  onClose,
  onAdded,
}: {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("identity");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      Alert.alert("Falta el título");
      return;
    }
    setSaving(true);
    try {
      await addDocument(supabase, {
        user_id: userId,
        title: title.trim(),
        doc_type: docType,
        holder: holder.trim() || null,
        expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null,
      });
      setTitle("");
      setHolder("");
      setExpiry("");
      onAdded();
      onClose();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    backgroundColor: theme.inputBg,
    borderColor: theme.inputBorder,
    color: theme.text,
    fontFamily: theme.fontFamily,
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <ScreenBackground>
        <ScrollView contentContainerStyle={styles.modal}>
          <ThemeText style={styles.modalTitle}>Nuevo documento</ThemeText>
          <ThemeText muted style={styles.label}>Título *</ThemeText>
          <TextInput
            style={[styles.input, inputStyle]}
            value={title}
            onChangeText={setTitle}
            placeholder="Pasaporte español"
            placeholderTextColor={theme.placeholder}
          />
          <ThemeText muted style={styles.label}>Tipo</ThemeText>
          <View style={styles.chips}>
            {DOC_TYPES.map((t) => {
              const on = docType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.chip,
                    { borderColor: on ? theme.primary : theme.surfaceBorder,
                      backgroundColor: on ? theme.primary : "transparent" },
                  ]}
                  onPress={() => setDocType(t.value)}
                >
                  <Text style={{ color: on ? theme.primaryText : theme.textMuted, fontSize: 13, fontFamily: theme.fontFamily }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <ThemeText muted style={styles.label}>Titular</ThemeText>
          <TextInput
            style={[styles.input, inputStyle]}
            value={holder}
            onChangeText={setHolder}
            placeholder="Alejandro"
            placeholderTextColor={theme.placeholder}
          />
          <ThemeText muted style={styles.label}>Caducidad (YYYY-MM-DD)</ThemeText>
          <TextInput
            style={[styles.input, inputStyle]}
            value={expiry}
            onChangeText={setExpiry}
            placeholder="2031-03-12"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
          />
          <ThemeText muted style={styles.privacyNote}>
            Solo se guardan estos datos. El fichero (PDF/foto) se adjuntará cuando
            esté listo el almacén cifrado del EQR6; nunca sale del host ni va a un modelo.
          </ThemeText>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <ThemeText muted style={styles.cancelText}>Cancelar</ThemeText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={save}
              disabled={saving}
            >
              <Text style={{ color: theme.primaryText, fontWeight: "700", fontFamily: theme.fontFamily }}>
                {saving ? "Guardando…" : "Guardar"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenBackground>
    </Modal>
  );
}

export function VaultScreen({ userId }: { userId: string }) {
  const { theme } = useTheme();
  const [docs, setDocs] = useState<VaultDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setDocs(await fetchDocuments(supabase));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const typeLabel = (t: DocType) => DOC_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <ScreenBackground>
      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
        }
        ListHeaderComponent={
          error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null
        }
        renderItem={({ item }) => (
          <Surface style={styles.rowCard} contentStyle={styles.row}>
            <View style={styles.rowLeft}>
              <ThemeText style={styles.docTitle}>{item.title}</ThemeText>
              <ThemeText muted style={styles.docMeta}>
                {typeLabel(item.doc_type)}
                {item.holder ? ` · ${item.holder}` : ""}
              </ThemeText>
            </View>
            <ExpiryBadge doc={item} />
          </Surface>
        )}
        ListEmptyComponent={
          !error ? (
            <ThemeText muted style={styles.empty}>
              Sin documentos. Añade tu pasaporte, visado, seguros… y saxa te avisa
              antes de que caduquen.
            </ThemeText>
          ) : null
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setAdding(true)}
      >
        <Text style={[styles.fabText, { color: theme.primaryText }]}>+</Text>
      </TouchableOpacity>
      <AddDocModal
        userId={userId}
        visible={adding}
        onClose={() => setAdding(false)}
        onAdded={load}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 70, paddingBottom: 110, gap: 10 },
  rowCard: {},
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  rowLeft: { flexShrink: 1, paddingRight: 12 },
  docTitle: { fontSize: 16, fontWeight: "600" },
  docMeta: { fontSize: 12, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 40, paddingHorizontal: 28 },
  error: { paddingBottom: 12 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { fontSize: 30, lineHeight: 34 },
  modal: { padding: 24, gap: 8, paddingTop: 64, paddingBottom: 60 },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  label: { fontSize: 13, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  privacyNote: { fontSize: 12, marginTop: 16, fontStyle: "italic" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24, justifyContent: "flex-end" },
  cancelBtn: { padding: 14 },
  cancelText: { fontWeight: "600" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
});
