import { ChatMessage } from "@/types/ChatMessage";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatDatabase } from "../services/chatDatabase";
import { socketService } from "../services/socketService";

export interface User {
  userId: string;
  userName: string;
  isTyping?: boolean;
  lastSeen?: string;
}

export interface Channel {
  name: string;
  userCount: number;
  lastActivity: string;
  messageCount: number;
}

export interface ChannelActivity {
  [channelName: string]: {
    lastActivity: string;
    messageCount: number;
    userCount: number;
  };
}

export const useChat = (userId: string, userName: string) => {
  const [currentChannel, setCurrentChannel] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [channelActivity, setChannelActivity] = useState<ChannelActivity>({});
  const [unreadCounts, setUnreadCounts] = useState<{
    [channel: string]: number;
  }>({});
  const [lastReadMessage, setLastReadMessage] = useState<{
    [channel: string]: string;
  }>({});
  const [mentionNotifications, setMentionNotifications] = useState<
    ChatMessage[]
  >([]);
  const [offlineQueue, setOfflineQueue] = useState<ChatMessage[]>([]);

  const offlineQueueRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initializeChat = async () => {
      // Initialize database
      await chatDatabase.initializeDatabase();

      // Load messages for current channel
      const savedMessages = await chatDatabase.getAllMessages(currentChannel);
      setMessages(savedMessages);

      // Set up listeners BEFORE connecting to avoid missing fast events (web)
      // This ordering plus buffered listeners in socketService prevents lost events
      // when the socket connects immediately.
      // Set up listeners
      const handleConnect = () => {
        setIsConnected(true);
        socketService.emit("user_join", { userId, userName });
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        // When disconnected, queue messages instead of sending
      };

      const handleChannelsList = (channelsList: string[]) => {
        setChannels(channelsList);
        // Auto-join general channel
        if (channelsList.length > 0 && currentChannel === "general") {
          socketService.emit("join_channel", {
            channel: "general",
            userId,
            userName,
          });
        }
      };

      const handleChannelJoined = (data: {
        channel: string;
        messages: ChatMessage[];
        users: User[];
        userCount: number;
      }) => {
        if (data.channel === currentChannel) {
          setMessages(data.messages);
          setUsers(data.users);
          // Load local messages and merge
          chatDatabase.getAllMessages(data.channel).then((localMessages) => {
            const merged = [...data.messages, ...localMessages]
              .filter(
                (m, idx, arr) => arr.findIndex((msg) => msg.id === m.id) === idx
              )
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              );
            setMessages(merged);
          });
        }
      };

      const handleNewMessage = async (message: ChatMessage) => {
        // Only show messages for current channel
        if (message.channel === currentChannel) {
          let shouldSave = true;
          setMessages((prev) => {
            // If we already have this exact server id, skip
            if (prev.find((m) => m.id === message.id)) {
              shouldSave = false;
              return prev;
            }

            // If server echoed client temp id, replace that optimistic message
            if (message.clientTempId) {
              const tempIndex = prev.findIndex(
                (m) => m.id === message.clientTempId
              );
              if (tempIndex !== -1) {
                const updated = [...prev];
                updated[tempIndex] = message;
                shouldSave = false;
                return updated;
              }
            }

            // Fallback: try legacy matching by content/time for cases where tempId not provided
            if (message.userId === userId) {
              const tempMessageIndex = prev.findIndex(
                (m) =>
                  m.userId === userId &&
                  m.text === message.text &&
                  m.id.startsWith("temp_") &&
                  Math.abs(
                    new Date(m.timestamp).getTime() -
                      new Date(message.timestamp).getTime()
                  ) < 5000
              );
              if (tempMessageIndex !== -1) {
                const updated = [...prev];
                updated[tempMessageIndex] = message;
                shouldSave = false;
                return updated;
              }
            }

            return [...prev, message];
          });

          if (shouldSave) {
            await chatDatabase.saveMessage({ ...message, delivered: true });
          }

          // Update last read if this is current channel
          setLastReadMessage((prev) => ({
            ...prev,
            [currentChannel]: message.id,
          }));
        } else {
          // Message in different channel - increment unread
          setUnreadCounts((prev) => ({
            ...prev,
            [message.channel]: (prev[message.channel] || 0) + 1,
          }));

          // Save message for that channel
          await chatDatabase.saveMessage({ ...message, delivered: true });
        }

        // Check for mentions
        if (
          message.mentions &&
          message.mentions.some((m) =>
            userName.toLowerCase().includes(m.toLowerCase())
          )
        ) {
          setMentionNotifications((prev) => [...prev, message]);
        }
      };

      const handleUserJoinedChannel = (data: {
        userId: string;
        userName: string;
        channel: string;
        timestamp: string;
      }) => {
        if (data.channel === currentChannel) {
          setUsers((prev) => {
            if (prev.find((u) => u.userId === data.userId)) {
              return prev;
            }
            return [
              ...prev,
              {
                userId: data.userId,
                userName: data.userName,
              },
            ];
          });
        }
      };

      const handleUserLeftChannel = (data: {
        userId: string;
        channel: string;
        timestamp: string;
      }) => {
        if (data.channel === currentChannel) {
          setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }
      };

      const handleChannelUsersUpdated = (data: {
        channel: string;
        users: User[];
        userCount: number;
      }) => {
        if (data.channel === currentChannel) {
          setUsers(data.users);
        }
      };

      const handleUserTyping = (data: {
        userId: string;
        userName: string;
        channel: string;
        isTyping: boolean;
      }) => {
        if (data.channel === currentChannel) {
          setTypingUsers((prev) => {
            if (data.isTyping) {
              return prev.includes(data.userId) ? prev : [...prev, data.userId];
            } else {
              return prev.filter((id) => id !== data.userId);
            }
          });
        }
      };

      const handleMentionNotification = (data: {
        message: ChatMessage;
        channel: string;
        timestamp: string;
      }) => {
        setMentionNotifications((prev) => [...prev, data.message]);
        // Also increment unread for that channel
        setUnreadCounts((prev) => ({
          ...prev,
          [data.channel]: (prev[data.channel] || 0) + 1,
        }));
      };

      const handleChannelActivity = (activity: ChannelActivity) => {
        setChannelActivity(activity);
      };

      socketService.on("connect", handleConnect);
      socketService.on("disconnect", handleDisconnect);
      socketService.on("channels_list", handleChannelsList);
      socketService.on("channel_joined", handleChannelJoined);
      socketService.on("new_message", handleNewMessage);
      // Debug logs to help trace event delivery
      socketService.on("channels_list", (list) =>
        console.debug("[socket] channels_list", list)
      );
      socketService.on("channel_joined", (data) =>
        console.debug(
          "[socket] channel_joined",
          data.channel,
          "messages=",
          (data.messages || []).length
        )
      );
      socketService.on("new_message", (msg) =>
        console.debug(
          "[socket] new_message recv",
          msg && msg.id,
          msg && msg.channel
        )
      );
      socketService.on("user_joined_channel", handleUserJoinedChannel);
      socketService.on("user_left_channel", handleUserLeftChannel);
      socketService.on("channel_users_updated", handleChannelUsersUpdated);
      socketService.on("user_typing", handleUserTyping);
      socketService.on("mention_notification", handleMentionNotification);
      socketService.on("channel_activity", handleChannelActivity);

      // Then connect if not already connected
      if (!socketService.isConnected()) {
        socketService.connect();
      } else {
        // If already connected, perform the connect handler operations
        handleConnect();
      }

      // Sync offline queue when connected
      if (socketService.isConnected() && offlineQueueRef.current.length > 0) {
        const queue = [...offlineQueueRef.current];
        offlineQueueRef.current = [];
        queue.forEach((msg) => {
          socketService.emit("send_message", {
            channel: msg.channel,
            userId: msg.userId,
            userName: msg.userName,
            text: msg.text,
          });
        });
      }

      // Return cleanup function
      cleanup = () => {
        socketService.off("connect", handleConnect);
        socketService.off("disconnect", handleDisconnect);
        socketService.off("channels_list", handleChannelsList);
        socketService.off("channel_joined", handleChannelJoined);
        socketService.off("new_message", handleNewMessage);
        socketService.off("user_joined_channel", handleUserJoinedChannel);
        socketService.off("user_left_channel", handleUserLeftChannel);
        socketService.off("channel_users_updated", handleChannelUsersUpdated);
        socketService.off("user_typing", handleUserTyping);
        socketService.off("mention_notification", handleMentionNotification);
        socketService.off("channel_activity", handleChannelActivity);
      };
    };

    initializeChat();

    return () => {
      cleanup?.();
    };
  }, [userId, userName, currentChannel]);

  // Switch channel
  const switchChannel = useCallback(
    async (channelName: string) => {
      // Leave current channel
      if (currentChannel) {
        socketService.emit("leave_channel", {
          channel: currentChannel,
          userId,
        });
      }

      // Clear unread count for new channel
      setUnreadCounts((prev) => ({
        ...prev,
        [channelName]: 0,
      }));

      // Load local messages for new channel
      const localMessages = await chatDatabase.getAllMessages(channelName);
      setMessages(localMessages);

      // Update current channel
      setCurrentChannel(channelName);

      // Join new channel
      socketService.emit("join_channel", {
        channel: channelName,
        userId,
        userName,
      });
    },
    [currentChannel, userId, userName]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const message: ChatMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userName,
        text,
        timestamp: new Date().toISOString(),
        delivered: false,
        channel: currentChannel,
      };

      // Add optimistically
      setMessages((prev) => [...prev, message]);
      await chatDatabase.saveMessage(message);

      // Send to server if connected, otherwise queue
      if (socketService.isConnected()) {
        console.debug("[chat] emit send_message", {
          tempId: message.id,
          channel: currentChannel,
          userId,
        });
        socketService.emit("send_message", {
          channel: currentChannel,
          userId,
          userName,
          text,
          tempId: message.id, // include client temp id so server can echo it back
        });
      } else {
        // Queue for offline
        offlineQueueRef.current.push(message);
        setOfflineQueue((prev) => [...prev, message]);
      }
    },
    [userId, userName, currentChannel]
  );

  const startTyping = useCallback(() => {
    if (socketService.isConnected()) {
      socketService.emit("typing_start", {
        channel: currentChannel,
        userId,
        userName,
      });
    }
  }, [userId, userName, currentChannel]);

  const stopTyping = useCallback(() => {
    if (socketService.isConnected()) {
      socketService.emit("typing_stop", {
        channel: currentChannel,
        userId,
        userName,
      });
    }
  }, [userId, userName, currentChannel]);

  const searchMessages = useCallback(
    async (searchText: string): Promise<ChatMessage[]> => {
      return await chatDatabase.searchMessages(currentChannel, searchText);
    },
    [currentChannel]
  );

  const clearMentionNotifications = useCallback(() => {
    setMentionNotifications([]);
  }, []);

  const refreshChannelActivity = useCallback(() => {
    if (socketService.isConnected()) {
      socketService.emit("get_channel_activity");
    }
  }, []);

  return {
    currentChannel,
    messages,
    users,
    isConnected,
    typingUsers,
    channels,
    channelActivity,
    unreadCounts,
    mentionNotifications,
    offlineQueue,
    switchChannel,
    sendMessage,
    startTyping,
    stopTyping,
    searchMessages,
    clearMentionNotifications,
    refreshChannelActivity,
  };
};
