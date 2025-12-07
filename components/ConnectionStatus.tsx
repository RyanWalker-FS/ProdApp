import { socketService } from "@/services/socketService";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSocket } from "./useSocket";

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionError, emit, lastPong, onlineCount } =
    useSocket();

  const testConnection = () => {
    emit("ping", {
      clientTimestamp: new Date().toISOString(),
      platform: Platform.OS,
    });
  };

  return (
    <View
      style={[
        styles.container,
        isConnected ? styles.connectedContainer : styles.disconnectedContainer,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              isConnected ? styles.connectedDot : styles.disconnectedDot,
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            {typeof onlineCount === "number" && (
              <Text style={styles.countText}> • {onlineCount} online</Text>
            )}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.statusMessage,
          isConnected ? styles.connectedMessage : styles.disconnectedMessage,
        ]}
      >
        {isConnected
          ? "✓ Real-time synchronization active"
          : "✗ No connection to server"}
      </Text>

      {connectionError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Connection Error:</Text>
          <Text style={styles.errorText}>{connectionError}</Text>
          {connectionError === "timeout" && (
            <View style={styles.troubleshootingContainer}>
              <Text style={styles.troubleshootingTitle}>Troubleshooting:</Text>
              <Text style={styles.troubleshootingText}>
                {Platform.OS === "web"
                  ? "1. Ensure the server is running: cd realtime-server && npm start\n2. Check that port 3001 is accessible"
                  : "1. Set EXPO_PUBLIC_SOCKET_URL in .env to your computer's IP\n2. Format: http://YOUR_IP:3001\n3. Find your IP: ifconfig (Mac) or ipconfig (Windows)\n4. Ensure server is running: cd realtime-server && npm start"}
              </Text>
            </View>
          )}
        </View>
      )}

      {isConnected && lastPong && (
        <View style={styles.pongContainer}>
          <Text style={styles.pongText}>
            Last ping response: {lastPong.toLocaleTimeString()}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.testButton,
          isConnected ? styles.testButtonActive : styles.testButtonDisabled,
        ]}
        onPress={testConnection}
        disabled={!isConnected}
      >
        <Text style={styles.testButtonText}>
          {isConnected ? "Test Connection" : "Waiting for connection..."}
        </Text>
      </TouchableOpacity>

      {!isConnected && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
          <Text style={styles.infoText}>
            Server URL:{" "}
            {process.env.EXPO_PUBLIC_SOCKET_URL ||
              (Platform.OS === "web"
                ? "http://localhost:3001"
                : "http://192.168.1.100:3001")}
          </Text>
          <TouchableOpacity
            style={styles.reconnectButton}
            onPress={() => {
              socketService.disconnect();
              setTimeout(() => socketService.connect(), 500);
            }}
          >
            <Text style={styles.reconnectButtonText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  connectedContainer: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  disconnectedContainer: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  header: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  connectedDot: {
    backgroundColor: "#10b981",
  },
  disconnectedDot: {
    backgroundColor: "#ef4444",
  },
  statusText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  countText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    color: "#065f46",
  },
  statusMessage: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  connectedMessage: {
    color: "#065f46",
  },
  disconnectedMessage: {
    color: "#991b1b",
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#991b1b",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#7f1d1d",
  },
  pongContainer: {
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pongText: {
    fontSize: 14,
    color: "#065f46",
  },
  testButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  testButtonActive: {
    backgroundColor: "#10b981",
  },
  testButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  testButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  troubleshootingContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#fca5a5",
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#991b1b",
    marginBottom: 8,
  },
  troubleshootingText: {
    fontSize: 12,
    color: "#7f1d1d",
    lineHeight: 18,
  },
  infoContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  reconnectButton: {
    marginTop: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  reconnectButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
