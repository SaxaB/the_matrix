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

function ExpiryBadge({ doc }: { doc: VaultDocument }) {
  const info = expiryInfo(doc);
  if (info.daysLeft == null) return null;
  const color = info.expired ? "#c0262d" : info.soon ? "#b8860b" : "#0a7f3f";
  const text = info.expired
    ? `caducó hace ${-info.daysLeft}d`
    : `caduca en ${info.daysLeft}d`;
  return <Text style={[styles.badge, { color }]}>{text}</Text>;
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
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocType>("identity");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState(""); // YYYY-MM-DD
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.modal}>
        <Text style={styles.modalTitle}>Nuevo documento</Text>
        <Text style={styles.label}>Título *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle}
          placeholder="Pasaporte español" />
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.chips}>
          {DOC_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, docType === t.value && styles.chipOn]}
              onPress={() => setDocType(t.value)}
            >
              <Text style={docType === t.value ? styles.chipOnText : styles.chipText}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Titular</Text>
        <TextInput style={styles.input} value={holder} onChangeText={setHolder}
          placeholder="Alejandro" />
        <Text style={styles.label}>Caducidad (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={expiry} onChangeText={setExpiry}
          placeholder="2031-03-12" autoCapitalize="none" />
        <Text style={styles.privacyNote}>
          Solo se guardan estos datos. El fichero (PDF/foto) se adjuntará cuando
          esté listo el almacén cifrado del EQR6; nunca sale del host ni va a un modelo.
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "Guardando…" : "Guardar"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

export function VaultScreen({ userId }: { userId: string }) {
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
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={docs}
        keyExtractor={(d) => d.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.docTitle}>{item.title}</Text>
              <Text style={styles.docMeta}>
                {typeLabel(item.doc_type)}
                {item.holder ? ` · ${item.holder}` : ""}
              </Text>
            </View>
            <ExpiryBadge doc={item} />
          </View>
        )}
        ListEmptyComponent={
          !error ? (
            <Text style={styles.empty}>
              Sin documentos. Añade tu pasaporte, visado, seguros… y saxa te avisa
              antes de que caduquen.
            </Text>
          ) : null
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => setAdding(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <AddDocModal
        userId={userId}
        visible={adding}
        onClose={() => setAdding(false)}
        onAdded={load}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  rowLeft: { flexShrink: 1, paddingRight: 12 },
  docTitle: { fontSize: 16, fontWeight: "600" },
  docMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  badge: { fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", color: "#666", marginTop: 40, paddingHorizontal: 28 },
  error: { color: "#c0262d", padding: 16 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 30, lineHeight: 34 },
  modal: { padding: 24, gap: 8, paddingTop: 64 },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  label: { fontSize: 13, color: "#888", marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { color: "#333", fontSize: 13 },
  chipOnText: { color: "#fff", fontSize: 13 },
  privacyNote: { fontSize: 12, color: "#888", marginTop: 16, fontStyle: "italic" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24, justifyContent: "flex-end" },
  cancelBtn: { padding: 14 },
  cancelText: { color: "#666", fontWeight: "600" },
  saveBtn: { backgroundColor: "#111", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  saveText: { color: "#fff", fontWeight: "700" },
});
