import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform, ScrollView, StyleSheet } from "react-native";

import { ConnectionStatus } from "@/components/ConnectionStatus";
import { Text, View } from "@/components/Themed";

const REALTIME_SERVER_URL_BASE =
  process.env.REALTIME_SERVER_URL || "http://localhost:3001";
const REALTIME_SERVER_HEALTH = `${REALTIME_SERVER_URL_BASE.replace(
  /\/$/,
  ""
)}/health`;

export default function TabTwoScreen() {
  useEffect(() => {
    // Open the realtime-server when the user navigates to this tab.
    // On web we open a new tab; on native we open the system browser via Expo WebBrowser.
    (async () => {
      try {
        if (Platform.OS === "web") {
          window.open(REALTIME_SERVER_HEALTH, "_blank");
        } else {
          await WebBrowser.openBrowserAsync(REALTIME_SERVER_HEALTH);
        }
      } catch (err) {
        // ignore — UI provides a manual button below
        // console.warn('Failed to open realtime server', err);
      }
    })();
  }, []);

  const openManually = async () => {
    if (Platform.OS === "web") {
      window.open(REALTIME_SERVER_HEALTH, "_blank");
      return;
    }
    await WebBrowser.openBrowserAsync(REALTIME_SERVER_HEALTH);
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Realtime Server</Text>

      {/* Connection Status - Prominently displayed */}
      <ConnectionStatus />

      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: "80%",
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  openButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  openButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
