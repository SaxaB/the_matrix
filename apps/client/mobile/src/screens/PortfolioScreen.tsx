import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { formatCurrency, formatPct } from "@matrix/client-shared/format";
import {
  fetchPortfolio,
  type PortfolioView,
  type PositionView,
} from "@matrix/section-finance";
import { supabase } from "../supabase";
import { ScreenBackground, Surface, ThemeText } from "../theme/components";
import { useTheme } from "../theme/ThemeProvider";

const UP = "#2ecc71";
const DOWN = "#ff6b6b";

function PositionRow({ p }: { p: PositionView }) {
  const { theme } = useTheme();
  const pnlColor = p.pnlOpen >= 0 ? UP : DOWN;
  return (
    <Surface style={styles.rowCard} contentStyle={styles.row}>
      <View style={styles.rowLeft}>
        <ThemeText style={styles.ticker}>{p.ticker}</ThemeText>
        <ThemeText muted style={styles.name} numberOfLines={1}>
          {p.name}
        </ThemeText>
      </View>
      <View style={styles.rowRight}>
        <ThemeText style={styles.value}>{formatCurrency(p.value)}</ThemeText>
        <Text style={[styles.pnl, { color: pnlColor, fontFamily: theme.fontFamily }]}>
          {p.pnlOpenPct != null ? formatPct(p.pnlOpenPct) : "—"}
          {p.weightPct != null ? `  ·  ${p.weightPct.toFixed(1)}%` : ""}
        </Text>
      </View>
    </Surface>
  );
}

export function PortfolioScreen() {
  const { theme } = useTheme();
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
    <ScreenBackground>
      <FlatList
        data={portfolio?.positions ?? []}
        keyExtractor={(p) => p.ticker}
        renderItem={({ item }) => <PositionRow p={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {portfolio && (
              <>
                <ThemeText style={styles.total}>
                  {formatCurrency(portfolio.totalValue)}
                </ThemeText>
                <Text
                  style={[
                    styles.totalPnl,
                    { color: portfolio.pnlOpen >= 0 ? UP : DOWN, fontFamily: theme.fontFamily },
                  ]}
                >
                  PnL abierto: {formatCurrency(portfolio.pnlOpen)}
                </Text>
              </>
            )}
            {error && (
              <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <ThemeText muted style={styles.empty}>
              Sin posiciones todavía.
            </ThemeText>
          ) : null
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 70, paddingBottom: 110, gap: 10 },
  header: { alignItems: "center", gap: 4, marginBottom: 10 },
  total: { fontSize: 34, fontWeight: "700" },
  totalPnl: { fontSize: 14, fontWeight: "600" },
  rowCard: {},
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  rowLeft: { flexShrink: 1, paddingRight: 12 },
  rowRight: { alignItems: "flex-end" },
  ticker: { fontSize: 16, fontWeight: "700" },
  name: { fontSize: 12, maxWidth: 200 },
  value: { fontSize: 16, fontWeight: "600" },
  pnl: { fontSize: 12, fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 40 },
  error: { paddingBottom: 8 },
});
