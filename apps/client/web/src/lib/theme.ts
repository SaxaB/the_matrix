/**
 * Sistema de temas conmutable de Matrix. Cada tema es una clase en <html>
 * (theme-<id>) que redefine las variables CSS (colores + fuente). La elección
 * persiste en localStorage; un script anti-flash la aplica antes del paint.
 */

export const THEMES = [
  {
    id: "matrix",
    label: "Matrix",
    description: "Verde fosforito sobre negro, terminal CRT.",
    retro: true,
  },
  {
    id: "amber",
    label: "Terminal ámbar",
    description: "Ámbar sobre negro, monitor antiguo.",
    retro: true,
  },
  {
    id: "light",
    label: "Clásico",
    description: "Claro y limpio, el de siempre.",
    retro: false,
  },
  {
    id: "night",
    label: "Noche",
    description: "Oscuro neutro, sin estridencias.",
    retro: false,
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "matrix";
export const THEME_STORAGE_KEY = "matrix-theme";

export function themeClass(id: ThemeId): string {
  return `theme-${id}`;
}

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

/** Temas oscuros: además de su clase, activan `.dark` para los `dark:` de los componentes. */
export const DARK_THEMES: ThemeId[] = ["matrix", "amber", "night"];

export function isDarkTheme(id: ThemeId): boolean {
  return DARK_THEMES.includes(id);
}

/** Script inline (string) que aplica el tema guardado antes del primer paint. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'${DEFAULT_THEME}';var dark={matrix:1,amber:1,night:1};var c=document.documentElement.classList;['matrix','amber','light','night'].forEach(function(x){c.remove('theme-'+x)});c.add('theme-'+t);if(dark[t]){c.add('dark')}else{c.remove('dark')}}catch(e){}})();`;
