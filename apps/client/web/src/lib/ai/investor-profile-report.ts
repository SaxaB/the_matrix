import Anthropic from "@anthropic-ai/sdk";
import type { AppLocale } from "@/lib/i18n/config";
import type { AnonymizedInvestorPayloadV1 } from "./anonymized-investor-payload";

/** Cheapest current Claude tier for short reports (see Anthropic pricing / Haiku line). */
const DEFAULT_MODEL = "claude-haiku-4-5";

/** Anthropic cap on `max_tokens` per single Messages request (Haiku-class models). */
const MAX_TOKENS_PER_REQUEST = 64_000;

/** Default total **output** token budget for one full report (all continuation turns combined). */
const DEFAULT_OUTPUT_BUDGET_TOTAL = 64_000;

const MIN_OUTPUT_BUDGET_TOTAL = 4_096;

/** Safety cap so a pathological truncation loop cannot run forever. */
const MAX_CONTINUATION_ROUNDS = 10;

const CONTINUATION: Record<
  AppLocale,
  { system: string; user: string }
> = {
  es: {
    system:
      "Continúas el mismo informe en español, mismo tono Markdown. No repitas secciones ya cubiertas; solo completa o cierra el texto truncado.",
    user: "La respuesta anterior quedó cortada por límite de longitud. Continúa exactamente donde terminó (sin repetir párrafos completos). Prioriza terminar la sección «Limitaciones del análisis» con varias frases completas y un cierre claro.",
  },
  en: {
    system:
      "Continue the same report in English with the same Markdown tone. Do not repeat sections already covered; only complete or close the truncated text.",
    user: "The previous answer was cut off due to length limits. Continue exactly where it ended (without repeating full paragraphs). Prioritize finishing the “Analysis limitations” section with several complete sentences and a clear closing.",
  },
};

function getModel(): string {
  return process.env.ANTHROPIC_INVESTOR_REPORT_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Total output-token budget for one report generation (sum of all API turns).
 * Override: `ANTHROPIC_INVESTOR_REPORT_OUTPUT_BUDGET` (preferred) or legacy
 * `ANTHROPIC_INVESTOR_REPORT_MAX_TOKENS` (same meaning).
 */
function getTotalOutputBudget(): number {
  const raw =
    process.env.ANTHROPIC_INVESTOR_REPORT_OUTPUT_BUDGET?.trim() ||
    process.env.ANTHROPIC_INVESTOR_REPORT_MAX_TOKENS?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (
      Number.isFinite(n) &&
      n >= MIN_OUTPUT_BUDGET_TOTAL &&
      n <= MAX_TOKENS_PER_REQUEST
    ) {
      return n;
    }
  }
  return DEFAULT_OUTPUT_BUDGET_TOTAL;
}

function joinTextBlocks(
  content: Anthropic.Messages.Message["content"]
): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n");
}

/**
 * Calls Anthropic (Claude) with only the anonymized JSON payload (no user identifiers).
 * Stays within a single **total output budget** (default 64k) across all turns; if the model
 * hits `max_tokens` on a turn, continues until the report ends or the budget is exhausted.
 */
function buildSystemPrompt(locale: AppLocale): string {
  if (locale === "en") {
    return `You are a behavioral finance analyst. You receive anonymous JSON (schema matrix-investor-payload-v1) with:
- the app’s deterministic outcome (risk band, score 0–100),
- app_reference: official target % allocation, typical max volatility, and expected return range **already defined by the app** (this is the authoritative reference),
- dimensions: ordinal bands 1–4 per question (no identifying data).

Your output is a report in **English**, in **Markdown** (## and ###), for a retail investor with basic literacy.

## Goals for the text
- Clear, ordered, easy to read: short paragraphs, bullet lists when helpful.
- Avoid long tables unless one small table (max 1–2 in the whole report) is clearer than prose.
- **Do not repeat** the same idea across three sections: one idea, one block.
- Be **concise** in each section: the report must **finish completely** within the model’s output limit.

## Required content (in this order)
1. **Executive summary** (6–10 lines max): what the deterministic outcome implies and the main nuance from the dimensions.
2. **Alignment with the app**: explain that the % allocation and reference ranges come from \`app_reference\` and contrast with the qualitative read of the bands (do not invent other target percentages).
3. **Coherence and tensions** between dimensions (horizon, tolerance, experience, wealth/income/saving in ordinal terms only).
4. **Behavioral risks** (2–4 concrete items), without alarmism.
5. **Analysis limitations**: 4–6 sentences (what the questionnaire does not cover, that this is not advice, market uncertainty).

## Strict rules
- Use only ordinal information (band 1–4) and the \`app_reference\` block; **do not invent** euro amounts for wealth or income.
- **Do not recommend** specific instruments, funds, tickers, or concrete trades.
- **You must finish the report**: the last section (Limitations) must be **complete**, not cut mid-sentence.
- Avoid unnecessary jargon; if you use a technical term, explain it in one plain sentence.`;
  }

  return `Eres un analista financiero conductual. Recibes un JSON anónimo (esquema matrix-investor-payload-v1) con:
- resultado determinista de la app (banda de riesgo, puntuación 0–100),
- app_reference: asignación objetivo %, rango de rentabilidad esperada y volatilidad típica **ya definidos por la app** (son la referencia oficial),
- dimensiones: bandas ordinales 1–4 por pregunta (sin datos identificativos).

Tu salida es un informe en **español**, en **Markdown** (## y ###), para un inversor particular con formación básica.

## Objetivo del texto
- Clara, ordenada y fácil de leer: párrafos cortos, listas con viñetas cuando ayuden.
- Evita tablas largas salvo que resuman algo que sea más claro en tabla que en texto (máximo 1–2 tablas pequeñas en todo el informe).
- **No repitas** la misma idea en tres secciones distintas: una idea, un bloque.
- Sé **conciso** en cada sección: el informe debe poder **cerrarse completo** dentro del límite de salida del modelo (varias secciones, sin divagación).

## Contenido obligatorio (en este orden)
1. **Resumen ejecutivo** (6–10 líneas máximo): qué perfil implica el resultado determinista y el matiz principal de las dimensiones.
2. **Alineación con la app**: explica que la asignación % y rangos de referencia vienen de \`app_reference\` y contrasta con la lectura cualitativa de las bandas (sin inventar otros porcentajes objetivo).
3. **Coherencia y tensiones** entre dimensiones (horizonte, tolerancia, experiencia, patrimonio/ingresos/ahorro en términos ordinales solamente).
4. **Riesgos conductuales** (2–4 ítems concretos), sin alarmismo.
5. **Limitaciones del análisis**: 4–6 frases (qué no cubre el cuestionario, que no es asesoramiento, incertidumbre de mercado).

## Reglas estrictas
- Usa solo información ordinal (banda 1–4) y el bloque \`app_reference\`; **no inventes** cifras de patrimonio o ingresos en euros.
- **No recomiendes** instrumentos, fondos, tickers ni operaciones concretas.
- **Debes terminar el informe**: la última sección (Limitaciones) debe estar **completa**, sin cortarse a mitad de frase.
- No uses jerga innecesaria; si usas un término técnico, en una frase lo explicas.`;
}

export async function generateInvestorProfileReportMarkdown(
  payload: AnonymizedInvestorPayloadV1,
  locale: AppLocale
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });
  const model = getModel();
  let outputBudgetRemaining = getTotalOutputBudget();

  const system = buildSystemPrompt(locale);

  const user = `Datos de entrada (JSON anónimo):\n${JSON.stringify(payload)}`;

  type Msg = Anthropic.MessageParam;
  const messages: Msg[] = [{ role: "user", content: user }];

  let assembled = "";
  let round = 0;

  while (round < MAX_CONTINUATION_ROUNDS && outputBudgetRemaining > 0) {
    const max_tokens = Math.min(MAX_TOKENS_PER_REQUEST, outputBudgetRemaining);
    if (max_tokens < 256) {
      break;
    }

    const isFirstRound = round === 0;
    // Non-streaming requests are capped (~10 min) by the SDK; streaming avoids that limit.
    const stream = client.messages.stream({
      model,
      max_tokens,
      temperature: isFirstRound ? 0.3 : 0.2,
      system: isFirstRound ? system : CONTINUATION[locale].system,
      messages,
    });
    const res = await stream.finalMessage();

    const chunkRaw = joinTextBlocks(res.content);
    const spent = res.usage.output_tokens;
    outputBudgetRemaining -= spent;

    if (isFirstRound && !chunkRaw.trim()) {
      throw new Error("Empty response from Anthropic");
    }

    if (chunkRaw.length > 0) {
      assembled = assembled
        ? `${assembled.trimEnd()}\n\n${chunkRaw.trim()}`
        : chunkRaw.trim();
    }

    if (res.stop_reason !== "max_tokens") {
      break;
    }

    if (outputBudgetRemaining <= 0) {
      break;
    }

    messages.push({ role: "assistant", content: chunkRaw });
    messages.push({ role: "user", content: CONTINUATION[locale].user });
    round += 1;
  }

  return assembled.trim();
}
