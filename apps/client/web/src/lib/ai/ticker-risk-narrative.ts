import Anthropic from "@anthropic-ai/sdk";
import type { AppLocale } from "@/lib/i18n/config";
import type { TickerRiskBreakdownJson } from "@/lib/ticker-risk-score";

const DEFAULT_MODEL = "claude-haiku-4-5";

/**
 * Produces a short Spanish Markdown interpretation of the **already computed**
 * Matrix ticker risk panel. The model must not invent numbers: all scores live in `facts`.
 */
export async function generateTickerRiskNarrativeMarkdown(
  facts: {
    ticker: string;
    score: number;
    breakdown: TickerRiskBreakdownJson;
    /** Optional label from UI (demo sentiment), for context only. */
    demoSentimentLabel?: string | null;
  },
  locale: AppLocale
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const model =
    process.env.ANTHROPIC_TICKER_RISK_MODEL?.trim() || DEFAULT_MODEL;

  const system =
    locale === "en"
      ? `You are a financial educator for retail investors.
You receive JSON with the Matrix **analytical risk** score for a ticker (already computed by the app).
The scale is **5 to 95**: a higher number indicates more tension or complexity in portfolio-analysis context (relative volatility, drawdown, leverage, margins, etc.). It is **not** a buy or sell recommendation.

**Write the entire answer in English only** (headings and body). Field names in the JSON may be Spanish (\`labels_es\`, etc.) — translate concepts when you quote them.

Strict rules:
- **Do not invent** figures, new percentages, or ratios not present in the JSON.
- Do not contradict the \`score\`; explain it in plain language.
- If context is missing in the JSON, say so in one sentence.
- Output: **2–4 paragraphs** in Markdown (occasional **bold**). No level-1 heading (#). Optional ## at the start.
- Mention that the app uses public data (Yahoo/SEC) and deterministic heuristics.`
      : `Eres un educador financiero para inversores particulares en español.
Recibes un JSON con la puntuación Matrix de **riesgo analítico** de un valor (ya calculada por la app).
La escala es **5 a 95**: un número más alto indica más tensión o complejidad en el contexto de análisis de cartera (volatilidad relativa, drawdown, apalancamiento, márgenes, etc.). **No** es una recomendación de compra o venta.

Reglas estrictas:
- **No inventes** cifras, porcentajes nuevos ni ratios que no vengan en el JSON.
- No contradigas el número \`score\`; puedes explicarlo en lenguaje claro.
- Si falta contexto en el JSON, dilo en una frase.
- Salida: **2–4 párrafos** en Markdown (puedes usar **negrita** puntual). Sin título de nivel 1 (#). Opcional ## al inicio.
- Menciona que la app usa datos públicos (Yahoo/SEC) y heurísticas deterministas.`;

  const user =
    locale === "en"
      ? `Interpret this panel (do not recalculate anything). Respond in English.\n\n\`\`\`json\n${JSON.stringify(
          facts,
          null,
          2
        )}\n\`\`\``
      : `Interpreta este panel (no recalcules nada):\n\n\`\`\`json\n${JSON.stringify(
          facts,
          null,
          2
        )}\n\`\`\``;

  const msg = await client.messages.create({
    model,
    max_tokens: 900,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Empty response from Claude");
  }
  return text;
}
