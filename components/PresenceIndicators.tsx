import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Participant } from "../services/collaborativeService";

interface PresenceIndicatorsProps {
  participants: Participant[];
  currentUserId: string;
}

export const PresenceIndicators: React.FC<PresenceIndicatorsProps> = ({
  participants,
  currentUserId,
}) => {
  const activeParticipants = participants.filter(
    (p) => p.userId !== currentUserId && p.isActive
  );

  const getAvatarColor = (userId: string): string => {
    const colors = [
      "#ef4444", // red
      "#3b82f6", // blue
      "#10b981", // green
      "#eab308", // yellow
      "#a855f7", // purple
      "#ec4899", // pink
      "#6366f1", // indigo
      "#f97316", // orange
    ];
    const index = parseInt(userId.slice(-1) || "0", 10) % colors.length;
    return colors[index];
  };

  const getInitials = (userName: string): string => {
    return userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  if (activeParticipants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>You're working alone</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Active Collaborators</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{activeParticipants.length} online</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.participantsContainer}
      >
        {activeParticipants.map((participant) => (
          <View key={participant.userId} style={styles.participantItem}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: getAvatarColor(participant.userId) },
              ]}
            >
              <Text style={styles.avatarText}>
                {getInitials(participant.userName)}
              </Text>
            </View>
            <Text style={styles.participantName} numberOfLines={1}>
              {participant.userName}
            </Text>
            <Text style={styles.lastActivity}>
              {new Date(participant.lastActivity).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: "#6b7280",
  },
  participantsContainer: {
    flexDirection: "row",
    paddingRight: 8,
  },
  participantItem: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 60,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  participantName: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    maxWidth: 60,
    marginBottom: 2,
  },
  lastActivity: {
    fontSize: 10,
    color: "#9ca3af",
  },
  emptyContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});

