/**
 * Shell móvil de the_matrix (diseño §6bis): auth gate + tabs por sección.
 * Temas conmutables (Cristal/Matrix/Claro/Oscuro) vía ThemeProvider; el modo
 * Cristal usa BlurView (glassmorphism).
 */

import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";
import { ChatScreen } from "./src/screens/ChatScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PortfolioScreen } from "./src/screens/PortfolioScreen";
import { TradePlansScreen } from "./src/screens/TradePlansScreen";
import { TravelScreen } from "./src/screens/TravelScreen";
import { VaultScreen } from "./src/screens/VaultScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { AudioModeProvider } from "./src/voice/AudioModeProvider";

const Tab = createBottomTabNavigator();

function TabIcon({ glyph }: { glyph: string }) {
  return <Text style={{ fontSize: 18 }}>{glyph}</Text>;
}

function RootNavigator({ session }: { session: Session }) {
  const { theme } = useTheme();
  const glass = theme.mode === "glass";
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerTransparent: glass,
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.headerText,
        headerTitleStyle: { color: theme.headerText, fontFamily: theme.fontFamily },
        sceneStyle: { backgroundColor: "transparent" },
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.surfaceBorder,
          position: glass ? "absolute" : "relative",
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
      }}
    >
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
        name="90-day"
        component={TravelScreen}
        options={{ tabBarIcon: () => <TabIcon glyph="🛂" /> }}
      />
      <Tab.Screen name="Docs" options={{ tabBarIcon: () => <TabIcon glyph="🗂️" /> }}>
        {() => <VaultScreen userId={session.user.id} />}
      </Tab.Screen>
      <Tab.Screen name="Chat" options={{ tabBarIcon: () => <TabIcon glyph="💬" /> }}>
        {() => <ChatScreen userId={session.user.id} />}
      </Tab.Screen>
      <Tab.Screen name="Ajustes" options={{ tabBarIcon: () => <TabIcon glyph="⚙️" /> }}>
        {() => <SettingsScreen email={session.user.email ?? null} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function Root() {
  const { theme } = useTheme();
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
      <StatusBar style={theme.statusBar === "dark" ? "dark" : "light"} />
      {session ? <RootNavigator session={session} /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AudioModeProvider>
        <Root />
      </AudioModeProvider>
    </ThemeProvider>
  );
}
