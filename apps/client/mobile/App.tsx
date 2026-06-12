/**
 * Shell móvil de the_matrix (diseño §6bis): auth gate + tabs por sección.
 * La primera sección es Finanzas; las siguientes (calendar, travel, iot...)
 * añadirán su tab conforme entren los dominios (F8), igual que en la web.
 */

import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PortfolioScreen } from "./src/screens/PortfolioScreen";
import { TradePlansScreen } from "./src/screens/TradePlansScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

function TabIcon({ glyph }: { glyph: string }) {
  return <Text style={{ fontSize: 18 }}>{glyph}</Text>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooted(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!booted) return null;

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {session ? (
        <Tab.Navigator screenOptions={{ headerTitleAlign: "center" }}>
          <Tab.Screen
            name="Cartera"
            component={PortfolioScreen}
            options={{ tabBarIcon: () => <TabIcon glyph="📊" /> }}
          />
          <Tab.Screen
            name="Trade plans"
            component={TradePlansScreen}
            options={{ tabBarIcon: () => <TabIcon glyph="🧭" /> }}
          />
          <Tab.Screen
            name="Ajustes"
            options={{ tabBarIcon: () => <TabIcon glyph="⚙️" /> }}
          >
            {() => <SettingsScreen email={session.user.email ?? null} />}
          </Tab.Screen>
        </Tab.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
