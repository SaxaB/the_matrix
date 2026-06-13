"use client";

/**
 * Lluvia de código estilo Matrix, de fondo. Solo se activa en los temas retro
 * (matrix/amber) y toma su color del tema. Canvas a pantalla completa, detrás
 * del contenido, sin capturar eventos. Respeta prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/theme-context";

const GLYPHS =
  "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈ0123456789Z:.=*+-<>¦｜╌";

export function MatrixRain() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = theme === "matrix" || theme === "amber";

  useEffect(() => {
    if (!active) return;
    const el = canvasRef.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const color = theme === "amber" ? "255, 176, 0" : "0, 255, 90";
    const fontSize = 16;
    let columns = 0;
    let drops: number[] = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor((Math.random() * canvas.height) / fontSize)
      );
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0;
    const step = 55; // ms entre frames: cadencia de terminal, no frenético

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      if (now - last < step) return;
      last = now;

      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // cabeza brillante + estela tenue
        ctx.fillStyle = `rgba(${color}, 0.95)`;
        ctx.fillText(text, x, y);
        ctx.fillStyle = `rgba(${color}, 0.35)`;
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], x, y - fontSize);

        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        else drops[i]++;
      }
    }

    if (reduce) {
      // Sin animación: un único trazo estático tenue
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active, theme]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-25"
    />
  );
}
