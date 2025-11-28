import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";
import "../styles/global.css";

import { TasksProvider } from "@/components/TaskProvider";
import { useColorScheme } from "@/components/useColorScheme";
import secureStorage from "@/services/secureStorage";
import React, { useEffect, useState } from "react";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
// No explicit splash-screen control here; let Expo's default behavior manage it.

export default function RootLayout() {
  const systemColor = useColorScheme();
  const [themePref, setThemePref] = useState<"system" | "light" | "dark">(
    "system"
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await secureStorage.getItem("app_theme");
        if (!mounted) return;
        if (t === "light" || t === "dark" || t === "system") setThemePref(t);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  // Debug: log when RootLayout renders
  // This helps confirm JS is mounting and the layout is active.
  // Check Metro/console to see this message during startup.
  // eslint-disable-next-line no-console
  console.log("RootLayout mounted");

  const effectiveTheme = themePref === "system" ? systemColor : themePref;

  return (
    <ThemeProvider value={effectiveTheme === "dark" ? DarkTheme : DefaultTheme}>
      <TasksProvider>
        <Stack>
          {/* main tab group (contains index) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* task routes */}
          <Stack.Screen name="app-task" options={{ title: "Add Task" }} />
          <Stack.Screen name="edit-task" options={{ title: "Edit Task" }} />
          {/* modal route */}
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </TasksProvider>
    </ThemeProvider>
  );
}
