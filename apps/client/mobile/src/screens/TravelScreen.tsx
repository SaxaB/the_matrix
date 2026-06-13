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
import { ScreenBackground, Surface, ThemeText } from "../theme/components";
import { useTheme } from "../theme/ThemeProvider";

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
  const { theme } = useTheme();
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
        computeDueStatus(new Date(), parseDate(lastApproved?.filed_date ?? null), null)
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
    <ScreenBackground>
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text} />
        }
        ListHeaderComponent={
          <View>
            <Surface contentStyle={styles.hero}>
              <ThemeText style={styles.heroTitle}>90-day report (TM47)</ThemeText>
              <ThemeText style={styles.heroStatus}>{due?.label ?? "Cargando…"}</ThemeText>
              <ThemeText muted style={styles.heroHint}>
                saxa lo rellena y te manda la captura al chat para que apruebes.
              </ThemeText>
            </Surface>
            {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
            <ThemeText muted style={styles.sectionTitle}>
              HISTORIAL
            </ThemeText>
          </View>
        }
        renderItem={({ item }) => (
          <Surface style={styles.rowCard} contentStyle={styles.row}>
            <ThemeText style={styles.rowDate}>
              {item.filed_date
                ? new Date(`${item.filed_date}T12:00:00`).toLocaleDateString("es-ES")
                : item.due_date
                  ? `vence ${new Date(`${item.due_date}T12:00:00`).toLocaleDateString("es-ES")}`
                  : "—"}
            </ThemeText>
            <ThemeText muted style={styles.rowStatus}>
              {STATUS_LABEL[item.status] ?? item.status}
              {item.channel === "in_person" ? " · presencial" : ""}
            </ThemeText>
          </Surface>
        )}
        ListEmptyComponent={
          !error ? (
            <ThemeText muted style={styles.empty}>
              Sin reports registrados. Sube tu perfil y la última entrada para empezar.
            </ThemeText>
          ) : null
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 70, paddingBottom: 110, gap: 10 },
  hero: { padding: 18, gap: 6 },
  heroTitle: { fontSize: 20, fontWeight: "700" },
  heroStatus: { fontSize: 15 },
  heroHint: { fontSize: 12 },
  sectionTitle: { fontSize: 12, letterSpacing: 1, marginTop: 18, marginBottom: 2 },
  rowCard: {},
  row: { flexDirection: "row", justifyContent: "space-between", padding: 14 },
  rowDate: { fontSize: 15 },
  rowStatus: { fontSize: 13 },
  empty: { textAlign: "center", marginTop: 30, paddingHorizontal: 24 },
  error: { paddingVertical: 10 },
});
