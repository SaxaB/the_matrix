import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { formatDateEs } from "@matrix/client-shared/format";
import {
  avgEntry,
  computedRMultiple,
  fetchTradePlans,
  subscribeTradePlans,
  type TradePlan,
} from "@matrix/section-finance";
import { supabase } from "../supabase";
import { ScreenBackground, Surface, ThemeText } from "../theme/components";
import { useTheme } from "../theme/ThemeProvider";

const STATUS_LABEL: Record<TradePlan["status"], string> = {
  draft: "borrador",
  gated: "validado (pendiente de decisión)",
  published: "publicado",
  rejected: "rechazado",
  expired: "expirado",
};

function PlanCard({ plan }: { plan: TradePlan }) {
  const r = computedRMultiple(plan);
  return (
    <Surface contentStyle={styles.card}>
      <ThemeText style={styles.ticker}>
        {plan.ticker} <ThemeText muted style={styles.side}>{plan.side}</ThemeText>
      </ThemeText>
      <ThemeText muted style={styles.status}>
        {STATUS_LABEL[plan.status]}
      </ThemeText>
      <ThemeText style={styles.line}>
        Entrada media {avgEntry(plan).toFixed(2)} · SL {plan.stop_loss.toFixed(2)}
        {r != null ? ` · R ${r.toFixed(2)}` : ""}
      </ThemeText>
      <ThemeText muted style={styles.meta}>
        Tamaño objetivo {plan.position_pct_target.toFixed(1)}%
        {plan.created_at ? ` · ${formatDateEs(plan.created_at)}` : ""}
      </ThemeText>
      <ThemeText muted style={styles.disclaimer}>
        Recomendación L2 — ejecutar es siempre decisión humana.
      </ThemeText>
    </Surface>
  );
}

export function TradePlansScreen() {
  const { theme } = useTheme();
  const [plans, setPlans] = useState<TradePlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPlans(await fetchTradePlans(supabase, { statuses: ["gated", "published"] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const unsubscribe = subscribeTradePlans(supabase, () => void load());
    return unsubscribe;
  }, [load]);

  return (
    <ScreenBackground>
      <FlatList
        data={plans}
        keyExtractor={(p) => p.id ?? `${p.ticker}-${p.created_at}`}
        renderItem={({ item }) => <PlanCard plan={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null
        }
        ListEmptyComponent={
          !error ? (
            <ThemeText muted style={styles.empty}>
              Sin trade plans. Cuando saxa genere uno validado aparecerá aquí al instante.
            </ThemeText>
          ) : null
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 70, paddingBottom: 110, gap: 12 },
  card: { padding: 16, gap: 4 },
  ticker: { fontSize: 17, fontWeight: "700" },
  side: { fontSize: 12, fontWeight: "400" },
  status: { fontSize: 12 },
  line: { fontSize: 14 },
  meta: { fontSize: 12 },
  disclaimer: { fontSize: 11, marginTop: 6 },
  empty: { textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  error: { paddingBottom: 12 },
});
