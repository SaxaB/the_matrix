/**
 * Selector de tema para la pantalla de Ajustes. Tarjetas con muestra de color,
 * descripción y check del activo.
 */

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { THEME_LIST, type ThemeId } from "./themes";
import { useTheme } from "./ThemeProvider";

export function ThemePicker() {
  const { theme, themeId, setTheme } = useTheme();

  return (
    <View style={styles.list}>
      {THEME_LIST.map((t) => {
        const active = t.id === themeId;
        return (
          <TouchableOpacity
            key={t.id}
            activeOpacity={0.8}
            onPress={() => setTheme(t.id as ThemeId)}
            style={[
              styles.row,
              {
                borderColor: active ? theme.primary : theme.surfaceBorder,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <View style={styles.swatchWrap}>
              <View
                style={[styles.swatch, { backgroundColor: t.bgGradient[0] }]}
              />
              <View
                style={[
                  styles.swatchDot,
                  { backgroundColor: t.primary, borderColor: t.bgGradient[0] },
                ]}
              />
            </View>
            <View style={styles.texts}>
              <Text style={[styles.label, { color: theme.text, fontFamily: theme.fontFamily }]}>
                {t.label}
                {active ? "  ✓" : ""}
              </Text>
              <Text style={[styles.desc, { color: theme.textMuted, fontFamily: theme.fontFamily }]}>
                {t.description}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  swatchWrap: { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  swatch: { width: 34, height: 34, borderRadius: 9 },
  swatchDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  texts: { flex: 1 },
  label: { fontSize: 16, fontWeight: "700" },
  desc: { fontSize: 13, marginTop: 2 },
});
