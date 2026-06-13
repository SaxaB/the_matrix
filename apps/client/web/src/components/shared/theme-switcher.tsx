"use client";

/**
 * Selector de tema. `variant="grid"` para la página de ajustes (tarjetas con
 * descripción), `variant="menu"` para un desplegable compacto en la navbar.
 */

import { Check, Palette } from "lucide-react";
import { THEMES, type ThemeId } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SWATCHES: Record<ThemeId, string[]> = {
  matrix: ["#0a0e0a", "#00ff5a"],
  amber: ["#0d0a05", "#ffb000"],
  light: ["#ffffff", "#059669"],
  night: ["#1a1a1a", "#e5e5e5"],
};

function Swatch({ id }: { id: ThemeId }) {
  const [bg, fg] = SWATCHES[id];
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border"
      style={{ backgroundColor: bg, borderColor: fg }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: fg }} />
    </span>
  );
}

export function ThemeSwitcher({ variant = "grid" }: { variant?: "grid" | "menu" }) {
  const { theme, setTheme } = useTheme();

  if (variant === "menu") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground"
          title="Tema"
        >
          <Palette className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEMES.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="gap-2"
              >
                <Swatch id={t.id} />
                <span className="flex-1">{t.label}</span>
                {theme === t.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {THEMES.map((t) => {
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition",
              isActive
                ? "border-primary ring-2 ring-primary/40"
                : "border-border hover:border-foreground/30"
            )}
          >
            <Swatch id={t.id} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.label}</span>
                {isActive && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
