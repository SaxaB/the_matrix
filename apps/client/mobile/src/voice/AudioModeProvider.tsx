/**
 * "Modo audio": cuando está activo, saxa lee en voz alta sus respuestas (TTS
 * nativo). Toggle persistido en AsyncStorage. El dictado por micro funciona
 * siempre (no depende de este modo).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { stopSpeaking } from "./speech";

const STORAGE_KEY = "matrix-audio-mode";

interface AudioModeValue {
  audioMode: boolean;
  setAudioMode: (on: boolean) => void;
  toggle: () => void;
}

const AudioModeContext = createContext<AudioModeValue>({
  audioMode: false,
  setAudioMode: () => {},
  toggle: () => {},
});

export function AudioModeProvider({ children }: { children: React.ReactNode }) {
  const [audioMode, setAudioState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "1") setAudioState(true);
    });
  }, []);

  const setAudioMode = useCallback((on: boolean) => {
    setAudioState(on);
    AsyncStorage.setItem(STORAGE_KEY, on ? "1" : "0").catch(() => {});
    if (!on) stopSpeaking();
  }, []);

  const toggle = useCallback(() => setAudioMode(!audioMode), [audioMode, setAudioMode]);

  return (
    <AudioModeContext.Provider value={{ audioMode, setAudioMode, toggle }}>
      {children}
    </AudioModeContext.Provider>
  );
}

export function useAudioMode(): AudioModeValue {
  return useContext(AudioModeContext);
}
