/**
 * Texto → voz con la síntesis NATIVA del móvil (expo-speech). Gratis, sin
 * tokens API, funciona offline. Voz del sistema en español.
 *
 * Premium futuro (opcional, de pago): se podría sustituir `speak` por una
 * llamada a ElevenLabs/OpenAI TTS que devuelva audio y reproducirlo con
 * expo-av, sin tocar a los llamantes. Por eso el contrato es solo speak/stop.
 */

import * as Speech from "expo-speech";

/** Quita etiquetas HTML/markdown para que la voz no lea "<b>" ni "*". */
export function plainText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_`#>]/g, "")
    .replace(/https?:\/\/\S+/g, "enlace")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, opts?: { onDone?: () => void }): void {
  const clean = plainText(text);
  if (!clean) return;
  Speech.stop();
  Speech.speak(clean, {
    language: "es-ES",
    rate: 1.0,
    pitch: 1.0,
    onDone: opts?.onDone,
    onStopped: opts?.onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
