/**
 * Dictado por micro con el reconocimiento de voz NATIVO del móvil
 * (expo-speech-recognition). Gratis, sin tokens API, en español.
 *
 * Nota: usa código nativo → requiere un *development build* de Expo (no
 * funciona en Expo Go). Si el módulo no está disponible, `start` avisa en vez
 * de romper.
 */

import { useState } from "react";
import { Alert } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export function useDictation(onFinalText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript ?? "";
    if (event.isFinal) {
      setPartial("");
      if (transcript.trim()) onFinalText(transcript.trim());
    } else {
      setPartial(transcript);
    }
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    if (event.error !== "aborted") {
      Alert.alert("Dictado", event.message || "No se pudo reconocer la voz.");
    }
  });

  async function start() {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permiso necesario", "Activa el micrófono para hablar con saxa.");
        return;
      }
      setPartial("");
      setListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: "es-ES",
        interimResults: true,
        continuous: false,
      });
    } catch {
      setListening(false);
      Alert.alert(
        "No disponible",
        "El dictado por voz necesita un development build de Expo (no funciona en Expo Go)."
      );
    }
  }

  function stop() {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* módulo no disponible */
    }
    setListening(false);
  }

  return { listening, partial, start, stop };
}
