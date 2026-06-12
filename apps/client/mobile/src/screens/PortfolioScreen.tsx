import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatCurrency, formatPct } from "@matrix/client-shared/format";
import {
  fetchPortfolio,
  type PortfolioView,
  type PositionView,
} from "@matrix/section-finance";
import { supabase } from "../supabase";

function PositionRow({ p }: { p: PositionView }) {
  const pnlColor = p.pnlOpen >= 0 ? "#0a7f3f" : "#c0262d";
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.ticker}>{p.ticker}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {p.name}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.value}>{formatCurrency(p.value)}</Text>
        <Text style={[styles.pnl, { color: pnlColor }]}>
          {p.pnlOpenPct != null ? formatPct(p.pnlOpenPct) : "—"}
          {p.weightPct != null ? `  ·  ${p.weightPct.toFixed(1)}%` : ""}
        </Text>
      </View>
    </View>
  );
}

export function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState<PortfolioView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPortfolio(await fetchPortfolio(supabase));
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
      {portfolio && (
        <View style={styles.header}>
          <Text style={styles.total}>{formatCurrency(portfolio.totalValue)}</Text>
          <Text
            style={[
              styles.totalPnl,
              { color: portfolio.pnlOpen >= 0 ? "#0a7f3f" : "#c0262d" },
            ]}
          >
            PnL abierto: {formatCurrency(portfolio.pnlOpen)}
          </Text>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={portfolio?.positions ?? []}
        keyExtractor={(p) => p.ticker}
        renderItem={({ item }) => <PositionRow p={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>Sin posiciones todavía.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: "center", gap: 4 },
  total: { fontSize: 32, fontWeight: "700" },
  totalPnl: { fontSize: 14, fontWeight: "600" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  rowLeft: { flexShrink: 1, paddingRight: 12 },
  rowRight: { alignItems: "flex-end" },
  ticker: { fontSize: 16, fontWeight: "700" },
  name: { fontSize: 12, color: "#666", maxWidth: 200 },
  value: { fontSize: 16, fontWeight: "600" },
  pnl: { fontSize: 12, fontWeight: "600" },
  empty: { textAlign: "center", color: "#666", marginTop: 40 },
  error: { color: "#c0262d", paddingHorizontal: 20, paddingBottom: 8 },
});
