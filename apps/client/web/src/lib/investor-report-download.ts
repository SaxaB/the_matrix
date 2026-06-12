/**
 * Triggers a browser download of the investor report as a Markdown file (.md).
 * The database stores the same markdown body; optional YAML front matter is added only in the file.
 */
export function downloadInvestorReportMarkdown(
  body: string,
  options?: { generatedAt?: string | null }
): void {
  if (typeof document === "undefined") return;

  const date = options?.generatedAt
    ? new Date(options.generatedAt)
    : new Date();
  const iso = date.toISOString().slice(0, 10);

  const header = `---
title: Informe de perfil de inversor
generator: Matrix
generated_at: ${date.toISOString()}
---

> Documento generado automáticamente por Matrix. No constituye asesoramiento personalizado.

---

`;

  const blob = new Blob([header + body.trim() + "\n"], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `matrix-informe-perfil-${iso}.md`;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}
