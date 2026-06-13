/**
 * Pantalla Travel (P4): estado del 90-day report TM47.
 * Muestra el vencimiento calculado y el historial; el envío real lo prepara
 * saxa y se aprueba desde el tab Chat (tarjeta de aprobación).
 */

import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import {
  computeDueStatus,
  fetchTm47Reports,
  type DueStatus,
  type Tm47Report,
} from "@matrix/section-travel";
import { supabase } from "../supabase";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "programado",
  preparing: "preparando",
  awaiting_approval: "pendiente de tu aprobación",
  submitted: "enviado",
  approved: "aprobado",
  rejected: "rechazado",
  in_person: "presencial",
  cancelled: "cancelado",
};

function parseDate(s: string | null): Date | null {
  return s ? new Date(`${s}T12:00:00`) : null;
}

export function TravelScreen() {
  const [reports, setReports] = useState<Tm47Report[]>([]);
  const [due, setDue] = useState<DueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const rows = await fetchTm47Reports(supabase);
      setReports(rows);
      const lastApproved = rows.find((r) => r.status === "approved" && r.filed_date);
      setDue(
        computeDueStatus(
          new Date(),
          parseDate(lastApproved?.filed_date ?? null),
          null // las entradas se suman cuando el usuario las cargue
        )
      );
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

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>90-day report (TM47)</Text>
        <Text style={styles.heroStatus}>{due?.label ?? "Cargando…"}</Text>
        <Text style={styles.heroHint}>
          saxa lo rellena y te manda la captura al chat para que apruebes.
        </Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.sectionTitle}>Historial</Text>
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowDate}>
              {item.filed_date
                ? new Date(`${item.filed_date}T12:00:00`).toLocaleDateString("es-ES")
                : item.due_date
                  ? `vence ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("es-ES")}`
                  : "—"}
            </Text>
            <Text style={styles.rowStatus}>
              {STATUS_LABEL[item.status] ?? item.status}
              {item.channel === "in_person" ? " · presencial" : ""}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !error ? (
            <Text style={styles.empty}>
              Sin reports registrados. Sube tu perfil y la última entrada para empezar.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: 20, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#ddd" },
  heroTitle: { fontSize: 20, fontWeight: "700" },
  heroStatus: { fontSize: 15 },
  heroHint: { fontSize: 12, color: "#666" },
  sectionTitle: { fontSize: 13, color: "#888", paddingHorizontal: 20, paddingTop: 16, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee",
  },
  rowDate: { fontSize: 15 },
  rowStatus: { fontSize: 13, color: "#444" },
  empty: { textAlign: "center", color: "#666", marginTop: 30, paddingHorizontal: 24 },
  error: { color: "#c0262d", padding: 16 },
});
