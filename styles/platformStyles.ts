import { Platform, StyleSheet } from "react-native";
export const createPlatformStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f5f5f5",
      // Web-specific: Add max width for better desktop experience
      ...(Platform.OS === "web" && {
        maxWidth: 800,
        alignSelf: "center",
        width: "100%",
      }),
    },

    taskItem: {
      backgroundColor: "white",
      padding: Platform.OS === "web" ? 12 : 16,
      marginBottom: 8,
      borderRadius: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // Web-specific: Add hover effects
      ...(Platform.OS === "web" && {
        cursor: "pointer",
        transition: "all 0.2s ease",
      }),
    },

    addButton: {
      backgroundColor: "#007AFF",
      margin: 16,
      padding: Platform.OS === "web" ? 12 : 16,
      borderRadius: 8,
      alignItems: "center",
      // Web-specific: Add hover state
      ...(Platform.OS === "web" && {
        cursor: "pointer",
      }),
    },
  });
