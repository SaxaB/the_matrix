/**
 * Componentes base que reaccionan al tema. Las pantallas los usan en vez de
 * colores fijos, así un cambio de tema repinta toda la app.
 *
 * - ScreenBackground: degradado de fondo del tema (en glass, vivo para que el
 *   desenfoque tenga algo que difuminar).
 * - Surface: tarjeta. En modo glass = BlurView translúcido + borde con reflejo;
 *   en sólido = View opaco con borde.
 * - ThemeText: texto con el color del tema (y mono en Matrix).
 */

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "./ThemeProvider";

export function ScreenBackground({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={theme.bgGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function Surface({
  children,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const outer: ViewStyle = {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderTopColor: theme.surfaceHighlight,
    overflow: "hidden",
  };

  if (theme.mode === "glass") {
    return (
      <View style={[outer, style]}>
        <BlurView
          intensity={theme.blurIntensity}
          tint={theme.blurTint}
          style={StyleSheet.absoluteFill}
        />
        <View style={[{ backgroundColor: theme.surface }, contentStyle]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[outer, { backgroundColor: theme.surface }, style]}>
      <View style={contentStyle}>{children}</View>
    </View>
  );
}

export function ThemeText({
  muted,
  style,
  ...props
}: TextProps & { muted?: boolean }) {
  const { theme } = useTheme();
  const color = muted ? theme.textMuted : theme.text;
  const fontFamily = theme.fontFamily;
  return <Text {...props} style={[{ color, fontFamily } as TextStyle, style]} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
