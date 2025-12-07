import { useTheme } from "@react-navigation/native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ChannelListProps {
  channels: string[];
  currentChannel: string;
  unreadCounts: { [channel: string]: number };
  onChannelSelect: (channel: string) => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  currentChannel,
  unreadCounts,
  onChannelSelect,
}) => {
  const theme = useTheme();

  const getChannelDisplayName = (channel: string): string => {
    return channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card || "#ffffff",
          borderRightColor: theme.colors.border || "#e5e7eb",
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Channels
        </Text>
      </View>
      <ScrollView style={styles.channelList}>
        {channels.map((channel) => {
          const isActive = channel === currentChannel;
          const unreadCount = unreadCounts[channel] || 0;

          return (
            <TouchableOpacity
              key={channel}
              style={[
                styles.channelItem,
                isActive && {
                  backgroundColor: theme.colors.primary + "20",
                  borderLeftColor: theme.colors.primary,
                  borderLeftWidth: 3,
                },
              ]}
              onPress={() => onChannelSelect(channel)}
            >
              <View style={styles.channelContent}>
                <Text
                  style={[
                    styles.channelName,
                    {
                      color: isActive
                        ? theme.colors.primary
                        : theme.colors.text,
                      fontWeight: isActive ? "600" : "400",
                    },
                  ]}
                >
                  # {getChannelDisplayName(channel)}
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    borderRightWidth: 1,
    height: "100%",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  channelList: {
    flex: 1,
  },
  channelItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  channelContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  channelName: {
    fontSize: 15,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
