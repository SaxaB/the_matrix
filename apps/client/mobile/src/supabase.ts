/**
 * Cliente Supabase de la app móvil: factory compartido + AsyncStorage para
 * la sesión + polyfill de URL que React Native no trae.
 *
 * Env (inlinadas por Expo en build): EXPO_PUBLIC_SUPABASE_URL,
 * EXPO_PUBLIC_SUPABASE_ANON_KEY. Fuera de casa requieren el tunnel (F2+,
 * decisión #9); en LAN apuntan a http://<ip-del-eqr6>:8000.
 */

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createMatrixClient } from "@matrix/client-shared/supabase";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createMatrixClient(url, anonKey, { storage: AsyncStorage });
