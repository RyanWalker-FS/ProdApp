import { useChat } from "@/hooks/useChat";
import { userService } from "@/services/userService";
import { useTheme } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatScreen() {
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [showChannelList, setShowChannelList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const theme = useTheme();

  // Initialize user on mount
  useEffect(() => {
    const initUser = async () => {
      const user = await userService.getOrCreateUser();
      setUserId(user.userId);
      setUserName(user.userName);
    };
    initUser();
  }, []);

  const {
    currentChannel,
    messages,
    users,
    isConnected,
    typingUsers,
    channels,
    unreadCounts,
    mentionNotifications,
    switchChannel,
    sendMessage,
    startTyping,
    stopTyping,
    searchMessages,
    clearMentionNotifications,
    addReaction,
  } = useChat(userId, userName);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    await sendMessage(inputText.trim());
    setInputText("");
    handleStopTyping();
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      startTyping();
    } else if (text.length === 0 && isTyping) {
      handleStopTyping();
    }
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      stopTyping();
    }
  };

  const handleChannelSelect = async (channel: string) => {
    await switchChannel(channel);
    setShowChannelList(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchMessages(searchQuery);
    setSearchResults(results);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.userId === userId;
    const hasMentions = item.mentions && item.mentions.length > 0;
    const isMentioned =
      hasMentions &&
      item.mentions.some((m: string) =>
        userName.toLowerCase().includes(m.toLowerCase())
      );
    const reactions = item.reactions || [];

    // Group reactions by emoji
    const reactionGroups: { [emoji: string]: any[] } = {};
    reactions.forEach((r: any) => {
      if (!reactionGroups[r.emoji]) {
        reactionGroups[r.emoji] = [];
      }
      reactionGroups[r.emoji].push(r);
    });

    const commonReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage
            ? styles.ownMessageContainer
            : styles.otherMessageContainer,
          isMentioned && styles.mentionedMessage,
        ]}
      >
        {!isOwnMessage && (
          <Text style={[styles.messageSender, { color: theme.colors.text }]}>
            {item.userName}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            isMentioned && styles.mentionedBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isOwnMessage && (
              <Text style={styles.deliveryIndicator}>
                {" "}
                {item.delivered ? "✓✓" : "✓"}
              </Text>
            )}
            {hasMentions && <Text style={styles.mentionIndicator}> @</Text>}
          </View>

          {/* Reactions */}
          {Object.keys(reactionGroups).length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(reactionGroups).map(([emoji, users]) => {
                const hasUserReaction = users.some((r) => r.userId === userId);
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionButton,
                      hasUserReaction && styles.reactionButtonActive,
                    ]}
                    onPress={() => addReaction(item.id, emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>{users.length}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Quick reaction buttons */}
          <View style={styles.quickReactionsContainer}>
            {commonReactions.map((emoji) => {
              const hasReaction = reactions.some(
                (r: any) => r.emoji === emoji && r.userId === userId
              );
              if (!hasReaction) {
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.quickReactionButton}
                    onPress={() => addReaction(item.id, emoji)}
                  >
                    <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })}
          </View>
        </View>
      </View>
    );
  };

  const typingUsersList = typingUsers
    .map((id) => users.find((u) => u.userId === id)?.userName)
    .filter(Boolean);

  if (!userId || !userName) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.card || "#ffffff",
              borderBottomColor: theme.colors.border || "#e5e7eb",
            },
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => setShowChannelList(true)}
              style={styles.channelButton}
            >
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                #{" "}
                {currentChannel.charAt(0).toUpperCase() +
                  currentChannel.slice(1)}
              </Text>
              {unreadCounts[currentChannel] > 0 && (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.headerUnreadText}>
                    {unreadCounts[currentChannel]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setShowSearch(!showSearch)}
                style={styles.headerButton}
              >
                <Text
                  style={[
                    styles.headerButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  🔍
                </Text>
              </TouchableOpacity>
              <View
                style={[
                  styles.statusDot,
                  isConnected ? styles.connectedDot : styles.disconnectedDot,
                ]}
              />
            </View>
          </View>

          <View style={styles.headerSubContent}>
            <Text style={[styles.headerSubtitle, { color: theme.colors.text }]}>
              {users.length} users online
            </Text>
            {mentionNotifications.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Mentions",
                    `You have ${mentionNotifications.length} mention(s)`,
                    [{ text: "OK", onPress: clearMentionNotifications }]
                  );
                }}
                style={styles.mentionBadge}
              >
                <Text style={styles.mentionBadgeText}>
                  @ {mentionNotifications.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {typingUsersList.length > 0 && (
            <Text
              style={[styles.typingIndicator, { color: theme.colors.text }]}
            >
              {typingUsersList.join(", ")} typing...
            </Text>
          )}

          {showSearch && (
            <View style={styles.searchContainer}>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border || "#e5e7eb",
                  },
                ]}
                placeholder="Search messages..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.trim()) {
                    handleSearch();
                  } else {
                    setSearchResults([]);
                  }
                }}
                onSubmitEditing={handleSearch}
              />
            </View>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={
            showSearch && searchResults.length > 0 ? searchResults : messages
          }
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
          // ensure content can grow and be scrollable on iOS
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          // improve Android scrolling responsiveness
          scrollEventThrottle={16}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                {showSearch
                  ? "No search results"
                  : `No messages in #${currentChannel} yet. Start the conversation!`}
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.card || "#ffffff",
              borderTopColor: theme.colors.border || "#e5e7eb",
            },
          ]}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border || "#e5e7eb",
                },
              ]}
              placeholder={`Message #${currentChannel}...`}
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={handleTextChange}
              onSubmitEditing={handleSendMessage}
              onBlur={handleStopTyping}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                inputText.trim()
                  ? styles.sendButtonActive
                  : styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Channel List Modal */}
      <Modal
        visible={showChannelList}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChannelList(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowChannelList(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card || "#ffffff" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Select Channel
              </Text>
              <TouchableOpacity onPress={() => setShowChannelList(false)}>
                <Text style={[styles.modalClose, { color: theme.colors.text }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
            {channels.map((channel) => (
              <TouchableOpacity
                key={channel}
                style={[
                  styles.modalChannelItem,
                  currentChannel === channel && {
                    backgroundColor: theme.colors.primary + "20",
                  },
                ]}
                onPress={() => handleChannelSelect(channel)}
              >
                <Text
                  style={[
                    styles.modalChannelName,
                    {
                      color:
                        currentChannel === channel
                          ? theme.colors.primary
                          : theme.colors.text,
                      fontWeight: currentChannel === channel ? "600" : "400",
                    },
                  ]}
                >
                  # {channel.charAt(0).toUpperCase() + channel.slice(1)}
                </Text>
                {unreadCounts[channel] > 0 && (
                  <View style={styles.modalUnreadBadge}>
                    <Text style={styles.modalUnreadText}>
                      {unreadCounts[channel]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  channelButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerUnreadBadge: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerUnreadText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    marginRight: 12,
    padding: 4,
  },
  headerButtonText: {
    fontSize: 18,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connectedDot: {
    backgroundColor: "#10b981",
  },
  disconnectedDot: {
    backgroundColor: "#ef4444",
  },
  headerSubContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  mentionBadge: {
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mentionBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  typingIndicator: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
    opacity: 0.7,
  },
  searchContainer: {
    marginTop: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: "75%",
  },
  ownMessageContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  mentionedMessage: {
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    paddingLeft: 8,
  },
  messageSender: {
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 8,
    opacity: 0.7,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "#e5e7eb",
    borderBottomLeftRadius: 4,
  },
  mentionedBubble: {
    backgroundColor: "#fef3c7",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#ffffff",
  },
  otherMessageText: {
    color: "#1f2937",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: "#bfdbfe",
  },
  otherMessageTime: {
    color: "#6b7280",
  },
  deliveryIndicator: {
    marginLeft: 4,
    fontSize: 11,
  },
  mentionIndicator: {
    marginLeft: 4,
    fontSize: 11,
    color: "#f59e0b",
  },
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 4,
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionButtonActive: {
    backgroundColor: "#3b82f6",
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  quickReactionsContainer: {
    flexDirection: "row",
    marginTop: 4,
    gap: 4,
  },
  quickReactionButton: {
    padding: 4,
  },
  quickReactionEmoji: {
    fontSize: 16,
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
  },
  sendButtonActive: {
    backgroundColor: "#3b82f6",
  },
  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  modalClose: {
    fontSize: 24,
    fontWeight: "300",
  },
  modalChannelItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalChannelName: {
    fontSize: 16,
  },
  modalUnreadBadge: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalUnreadText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
