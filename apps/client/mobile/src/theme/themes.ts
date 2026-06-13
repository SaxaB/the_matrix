/**
 * Temas de la app móvil. Paralelo al sistema de la web, pero con un modo
 * exclusivo de móvil: **Cristal** (glassmorphism con expo-blur).
 *
 * El glass en React Native NO es backdrop-filter: es un BlurView translúcido
 * sobre un fondo con color/gradiente (ScreenBackground). Por eso cada tema
 * declara su `mode` ('glass' | 'solid') y los componentes Surface/ScreenBackground
 * se comportan distinto según el modo.
 */

import { Platform } from "react-native";

export type ThemeId = "glass" | "matrix" | "light" | "dark";
export type ThemeMode = "glass" | "solid";

export interface Theme {
  id: ThemeId;
  label: string;
  description: string;
  mode: ThemeMode;

  /** Fondo de pantalla: degradado (≥2 paradas). En sólidos suele ser un color repetido. */
  bgGradient: [string, string, ...string[]];

  text: string;
  textMuted: string;

  /** Superficie de tarjetas. En glass lleva alpha; el blur va debajo. */
  surface: string;
  surfaceBorder: string;
  surfaceHighlight: string; // reflejo del borde superior (glass)

  /** Solo glass: ajustes del BlurView. */
  blurTint: "light" | "dark" | "default";
  blurIntensity: number;

  primary: string;
  primaryText: string;
  danger: string;

  tabBarBg: string;
  tabActive: string;
  tabInactive: string;
  headerBg: string;
  headerText: string;
  statusBar: "light" | "dark";

  inputBg: string;
  inputBorder: string;
  placeholder: string;

  fontFamily?: string; // matrix: monospace
}

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

export const THEMES: Record<ThemeId, Theme> = {
  glass: {
    id: "glass",
    label: "Cristal",
    description: "Superficies translúcidas con desenfoque, estilo cristal líquido.",
    mode: "glass",
    bgGradient: ["#0b1224", "#241b3a", "#0e2b2b"],
    text: "#f5f7ff",
    textMuted: "rgba(235,240,255,0.66)",
    surface: "rgba(255,255,255,0.10)",
    surfaceBorder: "rgba(255,255,255,0.22)",
    surfaceHighlight: "rgba(255,255,255,0.55)",
    blurTint: "dark",
    blurIntensity: 38,
    primary: "rgba(255,255,255,0.92)",
    primaryText: "#10121f",
    danger: "#ff6b6b",
    tabBarBg: "rgba(14,16,28,0.55)",
    tabActive: "#ffffff",
    tabInactive: "rgba(235,240,255,0.5)",
    headerBg: "transparent",
    headerText: "#f5f7ff",
    statusBar: "light",
    inputBg: "rgba(255,255,255,0.10)",
    inputBorder: "rgba(255,255,255,0.22)",
    placeholder: "rgba(235,240,255,0.5)",
  },
  matrix: {
    id: "matrix",
    label: "Matrix",
    description: "Verde fosforito sobre negro, terminal.",
    mode: "solid",
    bgGradient: ["#04140a", "#020a06"],
    text: "#4dff88",
    textMuted: "rgba(77,255,136,0.6)",
    surface: "rgba(0,255,90,0.05)",
    surfaceBorder: "rgba(0,255,90,0.3)",
    surfaceHighlight: "rgba(0,255,90,0.5)",
    blurTint: "dark",
    blurIntensity: 0,
    primary: "#00ff5a",
    primaryText: "#04140a",
    danger: "#ff5555",
    tabBarBg: "#04140a",
    tabActive: "#00ff5a",
    tabInactive: "rgba(77,255,136,0.45)",
    headerBg: "#04140a",
    headerText: "#4dff88",
    statusBar: "light",
    inputBg: "rgba(0,255,90,0.06)",
    inputBorder: "rgba(0,255,90,0.3)",
    placeholder: "rgba(77,255,136,0.45)",
    fontFamily: MONO,
  },
  light: {
    id: "light",
    label: "Claro",
    description: "Limpio y luminoso.",
    mode: "solid",
    bgGradient: ["#f6f7f9", "#eef0f3"],
    text: "#111418",
    textMuted: "#6b7280",
    surface: "#ffffff",
    surfaceBorder: "#e5e7eb",
    surfaceHighlight: "#ffffff",
    blurTint: "light",
    blurIntensity: 0,
    primary: "#111418",
    primaryText: "#ffffff",
    danger: "#c0262d",
    tabBarBg: "#ffffff",
    tabActive: "#111418",
    tabInactive: "#9ca3af",
    headerBg: "#ffffff",
    headerText: "#111418",
    statusBar: "dark",
    inputBg: "#ffffff",
    inputBorder: "#d1d5db",
    placeholder: "#9ca3af",
  },
  dark: {
    id: "dark",
    label: "Oscuro",
    description: "Oscuro neutro para la noche.",
    mode: "solid",
    bgGradient: ["#0e0e10", "#0a0a0c"],
    text: "#fafafa",
    textMuted: "#a1a1aa",
    surface: "#1b1b1e",
    surfaceBorder: "#2c2c2f",
    surfaceHighlight: "#3a3a3e",
    blurTint: "dark",
    blurIntensity: 0,
    primary: "#fafafa",
    primaryText: "#0e0e10",
    danger: "#f87171",
    tabBarBg: "#141416",
    tabActive: "#fafafa",
    tabInactive: "#6b7280",
    headerBg: "#141416",
    headerText: "#fafafa",
    statusBar: "light",
    inputBg: "#1b1b1e",
    inputBorder: "#2c2c2f",
    placeholder: "#6b7280",
  },
};

export const THEME_LIST: Theme[] = [
  THEMES.glass,
  THEMES.matrix,
  THEMES.light,
  THEMES.dark,
];

export const DEFAULT_THEME: ThemeId = "glass";
export const THEME_STORAGE_KEY = "matrix-mobile-theme";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && v in THEMES;
}
