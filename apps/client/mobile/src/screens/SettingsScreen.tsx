import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../supabase";

export function SettingsScreen({ email }: { email: string | null }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sesión</Text>
      <Text style={styles.value}>{email ?? "—"}</Text>
      <Text style={styles.label}>Servidor</Text>
      <Text style={styles.value}>{process.env.EXPO_PUBLIC_SUPABASE_URL ?? "no configurado"}</Text>
      <TouchableOpacity style={styles.button} onPress={() => void supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 6 },
  label: { fontSize: 12, color: "#888", marginTop: 16, textTransform: "uppercase" },
  value: { fontSize: 16 },
  button: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: "#c0262d",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  buttonText: { color: "#c0262d", fontWeight: "600" },
});
