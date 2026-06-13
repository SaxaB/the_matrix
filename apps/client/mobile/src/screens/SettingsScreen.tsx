import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../supabase";
import { ScreenBackground, Surface, ThemeText } from "../theme/components";
import { ThemePicker } from "../theme/ThemePicker";
import { useTheme } from "../theme/ThemeProvider";

export function SettingsScreen({ email }: { email: string | null }) {
  const { theme } = useTheme();
  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemeText style={styles.h1}>Ajustes</ThemeText>

        <ThemeText muted style={styles.section}>
          APARIENCIA
        </ThemeText>
        <ThemePicker />

        <ThemeText muted style={styles.section}>
          SESIÓN
        </ThemeText>
        <Surface contentStyle={styles.card}>
          <ThemeText muted style={styles.label}>
            Usuario
          </ThemeText>
          <ThemeText style={styles.value}>{email ?? "—"}</ThemeText>
          <ThemeText muted style={[styles.label, styles.mt]}>
            Servidor
          </ThemeText>
          <ThemeText style={styles.value}>
            {process.env.EXPO_PUBLIC_SUPABASE_URL ?? "no configurado"}
          </ThemeText>
        </Surface>

        <TouchableOpacity
          style={[styles.button, { borderColor: theme.danger }]}
          onPress={() => void supabase.auth.signOut()}
        >
          <Text style={[styles.buttonText, { color: theme.danger, fontFamily: theme.fontFamily }]}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 70, paddingBottom: 110, gap: 8 },
  h1: { fontSize: 28, fontWeight: "700" },
  section: { fontSize: 12, letterSpacing: 1, marginTop: 18, marginBottom: 4 },
  card: { padding: 16 },
  label: { fontSize: 12, textTransform: "uppercase" },
  value: { fontSize: 16 },
  mt: { marginTop: 12 },
  button: {
    marginTop: 28,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { fontWeight: "700" },
});
