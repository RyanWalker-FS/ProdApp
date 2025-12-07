import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSocket } from "../hooks/useSocket";

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionError, emit, lastPong } = useSocket();
  
  const testConnection = () => {
    emit("ping", {
      clientTimestamp: new Date().toISOString(),
      platform: Platform.OS,
    });
  };

  return (
    <View className={`rounded-xl p-5 mb-6 border-2 shadow-lg ${
      isConnected 
        ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" 
        : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
    }`}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View
            className={`w-4 h-4 rounded-full mr-3 ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
            style={{
              shadowColor: isConnected ? "#10b981" : "#ef4444",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 8,
            }}
          />
          <Text className="text-xl font-bold text-gray-800 dark:text-white">
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </Text>
        </View>
      </View>

      <Text className={`text-base font-medium mb-2 ${
        isConnected 
          ? "text-green-700 dark:text-green-300" 
          : "text-red-700 dark:text-red-300"
      }`}>
        {isConnected 
          ? "✓ Real-time synchronization active" 
          : "✗ No connection to server"}
      </Text>

      {connectionError && (
        <View className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 mb-3">
          <Text className="text-sm font-semibold text-red-800 dark:text-red-200">
            Connection Error:
          </Text>
          <Text className="text-sm text-red-700 dark:text-red-300 mt-1">
            {connectionError}
          </Text>
        </View>
      )}

      {isConnected && lastPong && (
        <View className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 mb-3">
          <Text className="text-sm text-green-700 dark:text-green-300">
            Last ping response: {lastPong.toLocaleTimeString()}
          </Text>
        </View>
      )}

      <TouchableOpacity
        className={`rounded-lg py-3 px-5 ${
          isConnected 
            ? "bg-green-600 active:bg-green-700" 
            : "bg-gray-400"
        }`}
        onPress={testConnection}
        disabled={!isConnected}
      >
        <Text className="text-white text-center font-semibold text-base">
          {isConnected ? "Test Connection" : "Waiting for connection..."}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
