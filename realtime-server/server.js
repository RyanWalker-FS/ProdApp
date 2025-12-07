require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
// Configure CORS for cross-platform access
// In development, allow all origins for easier testing
const isDevelopment = process.env.NODE_ENV !== "production";
const allowedOrigins = isDevelopment
  ? true // Allow all origins in development
  : [
      "http://localhost:3000", // Web development
      "http://localhost:19006", // Expo web
      process.env.ALLOWED_ORIGIN || "*", // Configurable production origin
    ];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Enable polling fallback for problematic networks
  transports: ["websocket", "polling"],
  // Add connection timeout
  connectTimeout: 20000,
});
// Middleware
app.use(cors());
app.use(express.json());
// Collaborative state storage
const collaborativeRooms = new Map();
const userPresence = new Map();

// Chat storage - organized by channel
const chatChannels = new Map(); // channelName -> { messages: [], users: Map() }
const chatUsers = new Map(); // socketId -> userData
const userChannels = new Map(); // socketId -> Set of channel names

// Initialize default channels
const DEFAULT_CHANNELS = ["general", "development", "random"];
DEFAULT_CHANNELS.forEach((channel) => {
  chatChannels.set(channel, {
    messages: [],
    users: new Map(), // userId -> userData
    lastActivity: new Date().toISOString(),
  });
});

// Collaborative state management
class CollaborativeRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.sharedState = {};
    this.participants = new Map();
    this.activeEditors = new Map(); // field -> userId
    this.operationHistory = [];
    this.lastOperationId = 0;
  }

  addParticipant(userId, userName, socketId) {
    this.participants.set(userId, {
      userId,
      userName,
      socketId,
      cursor: null,
      selection: null,
      lastActivity: new Date().toISOString(),
      isActive: true,
    });
  }

  removeParticipant(userId) {
    this.participants.delete(userId);
    // Remove any active edits by this user
    for (const [field, editorId] of this.activeEditors.entries()) {
      if (editorId === userId) {
        this.activeEditors.delete(field);
      }
    }
  }

  applyOperation(operation) {
    const opId = ++this.lastOperationId;
    const timestampedOp = {
      ...operation,
      id: opId,
      timestamp: new Date().toISOString(),
    };

    // Apply operation to shared state
    this.updateSharedState(timestampedOp);

    // Store in history for new clients
    this.operationHistory.push(timestampedOp);

    // Keep only last 100 operations
    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-100);
    }
    return timestampedOp;
  }

  updateSharedState(operation) {
    const { type, path, value, userId } = operation;

    switch (type) {
      case "SET_VALUE":
        this.setNestedValue(this.sharedState, path, value);
        break;
      case "UPDATE_TASK":
        if (!this.sharedState.tasks) this.sharedState.tasks = {};
        this.sharedState.tasks[operation.taskId] = {
          ...this.sharedState.tasks[operation.taskId],
          ...operation.updates,
          lastModifiedBy: userId,
          lastModifiedAt: operation.timestamp,
        };
        break;
      case "ADD_TASK":
        if (!this.sharedState.tasks) this.sharedState.tasks = {};
        this.sharedState.tasks[operation.taskId] = operation.task;
        break;
      case "DELETE_TASK":
        if (this.sharedState.tasks) {
          delete this.sharedState.tasks[operation.taskId];
        }
        break;
    }
  }

  setNestedValue(obj, path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  startEditing(userId, field) {
    const currentEditor = this.activeEditors.get(field);
    if (currentEditor && currentEditor !== userId) {
      return { success: false, currentEditor };
    }

    this.activeEditors.set(field, userId);
    return { success: true };
  }

  stopEditing(userId, field) {
    if (this.activeEditors.get(field) === userId) {
      this.activeEditors.delete(field);
    }
  }

  updatePresence(userId, presenceData) {
    const participant = this.participants.get(userId);
    if (participant) {
      Object.assign(participant, presenceData, {
        lastActivity: new Date().toISOString(),
        isActive: true,
      });
    }
  }

  getActiveEditors() {
    const activeEdits = {};
    for (const [field, userId] of this.activeEditors.entries()) {
      const user = this.participants.get(userId);
      if (user) {
        activeEdits[field] = {
          userId,
          userName: user.userName,
          startedAt: user.lastActivity,
        };
      }
    }
    return activeEdits;
  }

  getParticipantsList() {
    return Array.from(this.participants.values()).map((p) => ({
      userId: p.userId,
      userName: p.userName,
      isActive: p.isActive,
      cursor: p.cursor,
      selection: p.selection,
      lastActivity: p.lastActivity,
    }));
  }
}

// Basic HTTP endpoints
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

app.get("/messages", (req, res) => {
  const channel = req.query.channel || "general";
  const channelData = chatChannels.get(channel);
  if (channelData) {
    res.json({ messages: channelData.messages.slice(-50) });
  } else {
    res.json({ messages: [] });
  }
});

app.get("/channels", (req, res) => {
  const channels = Array.from(chatChannels.keys()).map((channelName) => {
    const channelData = chatChannels.get(channelName);
    return {
      name: channelName,
      userCount: channelData.users.size,
      lastActivity: channelData.lastActivity,
      messageCount: channelData.messages.length,
    };
  });
  res.json({ channels });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send connection confirmation
  socket.emit("connection_confirmed", {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  });

  // Join collaborative room
  socket.on("join_collaborative_room", async (data) => {
    const { roomId, userId, userName } = data;

    // Broadcast updated clients count to all connected clients
    io.emit("clients_count", io.engine.clientsCount);
    socket.join(roomId);

    // Get or create collaborative room
    if (!collaborativeRooms.has(roomId)) {
      collaborativeRooms.set(roomId, new CollaborativeRoom(roomId));
    }

    const room = collaborativeRooms.get(roomId);
    room.addParticipant(userId, userName, socket.id);

    // Send current state to new participant
    socket.emit("collaborative_state_sync", {
      roomId,
      sharedState: room.sharedState,
      operationHistory: room.operationHistory.slice(-20), // Last 20 operations
      participants: room.getParticipantsList(),
      activeEditors: room.getActiveEditors(),
    });

    // Notify others of new participant
    socket.to(roomId).emit("participant_joined", {
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });

    // Broadcast updated participant list
    io.to(roomId).emit("participants_updated", {
      participants: room.getParticipantsList(),
    });
  });

  // Handle collaborative operations
  socket.on("collaborative_operation", (data) => {
    const { roomId, operation } = data;
    const room = collaborativeRooms.get(roomId);

    if (!room) {
      socket.emit("operation_error", { error: "Room not found" });
      return;
    }
    // Apply operation and get timestamped version
    const processedOperation = room.applyOperation(operation);

    // Broadcast to all clients in room
    io.to(roomId).emit("operation_applied", {
      operation: processedOperation,
      sharedState: room.sharedState,
    });

    console.log(
      `Operation applied in room ${roomId}:`,
      processedOperation.type
    );
  });

  // Handle editing lock requests
  socket.on("request_edit_lock", (data) => {
    const { roomId, field, userId } = data;
    const room = collaborativeRooms.get(roomId);

    if (!room) {
      socket.emit("edit_lock_response", {
        success: false,
        error: "Room not found",
      });
      return;
    }
    const result = room.startEditing(userId, field);

    socket.emit("edit_lock_response", {
      success: result.success,
      field,
      currentEditor: result.currentEditor,
    });
    if (result.success) {
      // Notify others that this field is being edited
      socket.to(roomId).emit("field_locked", {
        field,
        userId,
        userName: room.participants.get(userId)?.userName,
      });
    }
    io.emit("clients_count", io.engine.clientsCount);
  });

  // Handle editing unlock
  socket.on("release_edit_lock", (data) => {
    const { roomId, field, userId } = data;
    const room = collaborativeRooms.get(roomId);

    if (room) {
      room.stopEditing(userId, field);

      // Notify others that field is available
      socket.to(roomId).emit("field_unlocked", {
        field,
        userId,
      });
    }
  });

  // Handle presence updates (cursor position, selection, etc.)
  socket.on("update_presence", (data) => {
    const { roomId, userId, presenceData } = data;
    const room = collaborativeRooms.get(roomId);

    if (room) {
      room.updatePresence(userId, presenceData);

      // Broadcast presence update to others
      socket.to(roomId).emit("presence_updated", {
        userId,
        presenceData,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle user going idle/active
  socket.on("user_activity_change", (data) => {
    const { roomId, userId, isActive } = data;
    const room = collaborativeRooms.get(roomId);

    if (room) {
      const participant = room.participants.get(userId);
      if (participant) {
        participant.isActive = isActive;
        participant.lastActivity = new Date().toISOString();

        // Broadcast activity change
        socket.to(roomId).emit("user_activity_updated", {
          userId,
          isActive,
          timestamp: participant.lastActivity,
        });
      }
    }
  });

  // Chat functionality with multi-channel support
  socket.on("user_join", (userData) => {
    chatUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });
    userChannels.set(socket.id, new Set());

    // Join default channel (general)
    socket.emit("channels_list", Array.from(chatChannels.keys()));
    socket.emit("join_channel", { channel: "general" });
  });

  socket.on("join_channel", (data) => {
    const { channel, userId, userName } = data;

    if (!chatChannels.has(channel)) {
      socket.emit("error", { message: "Channel not found" });
      return;
    }

    const channelData = chatChannels.get(channel);

    // Join Socket.io room
    socket.join(`channel:${channel}`);

    // Track user in channel
    if (userId && userName) {
      channelData.users.set(userId, {
        userId,
        userName,
        socketId: socket.id,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }

    // Track user's channels
    const userChannelsSet = userChannels.get(socket.id) || new Set();
    userChannelsSet.add(channel);
    userChannels.set(socket.id, userChannelsSet);

    // Send channel info to user
    socket.emit("channel_joined", {
      channel,
      messages: channelData.messages.slice(-50),
      users: Array.from(channelData.users.values()),
      userCount: channelData.users.size,
    });

    // Notify others in channel
    socket.to(`channel:${channel}`).emit("user_joined_channel", {
      userId,
      userName,
      channel,
      timestamp: new Date().toISOString(),
    });

    // Broadcast updated user list for channel
    io.to(`channel:${channel}`).emit("channel_users_updated", {
      channel,
      users: Array.from(channelData.users.values()),
      userCount: channelData.users.size,
    });
  });

  socket.on("leave_channel", (data) => {
    const { channel, userId } = data;
    const channelData = chatChannels.get(channel);

    if (channelData && userId) {
      channelData.users.delete(userId);
    }

    socket.leave(`channel:${channel}`);

    const userChannelsSet = userChannels.get(socket.id);
    if (userChannelsSet) {
      userChannelsSet.delete(channel);
    }

    // Notify others in channel
    socket.to(`channel:${channel}`).emit("user_left_channel", {
      userId,
      channel,
      timestamp: new Date().toISOString(),
    });

    // Broadcast updated user list
    if (channelData) {
      io.to(`channel:${channel}`).emit("channel_users_updated", {
        channel,
        users: Array.from(channelData.users.values()),
        userCount: channelData.users.size,
      });
    }
  });

  socket.on("send_message", (messageData) => {
    const { channel, userId, userName, text, tempId } = messageData;

    if (!channel || !chatChannels.has(channel)) {
      socket.emit("error", { message: "Invalid channel" });
      return;
    }

    // Extract mentions from message text
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      text,
      channel,
      timestamp: new Date().toISOString(),
      mentions: mentions.length > 0 ? mentions : undefined,
      // Echo client temp id if provided so clients can correlate optimistic messages
      clientTempId: tempId,
    };

    const channelData = chatChannels.get(channel);
    channelData.messages.push(message);
    channelData.lastActivity = new Date().toISOString();

    // Keep only last 100 messages per channel in memory
    if (channelData.messages.length > 100) {
      channelData.messages.shift();
    }

    // Send to all users in the channel
    // Debug logging: show which sockets are in the channel room
    try {
      const room = io.sockets.adapter.rooms.get(`channel:${channel}`);
      const socketIds = room ? Array.from(room) : [];
      console.log(
        `send_message -> channel=${channel}, messageId=${message.id}, roomSockets=${socketIds.length}`,
        socketIds
      );
    } catch (err) {
      console.warn(
        "Unable to inspect room membership for channel",
        channel,
        err
      );
    }

    io.to(`channel:${channel}`).emit("new_message", message);

    // If there are mentions, notify mentioned users even if they're in other channels
    if (mentions.length > 0) {
      // Find mentioned users across all channels
      const mentionedUsers = [];
      chatChannels.forEach((chData) => {
        chData.users.forEach((user) => {
          if (
            mentions.some((m) =>
              user.userName.toLowerCase().includes(m.toLowerCase())
            )
          ) {
            mentionedUsers.push(user.userId);
          }
        });
      });

      // Send mention notifications
      mentionedUsers.forEach((mentionedUserId) => {
        const mentionedUser = Array.from(chatUsers.values()).find(
          (u) => u.userId === mentionedUserId
        );
        if (mentionedUser) {
          io.to(mentionedUser.socketId).emit("mention_notification", {
            message,
            channel,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  });

  socket.on("typing_start", (data) => {
    const { channel } = data;
    if (channel) {
      socket.to(`channel:${channel}`).emit("user_typing", {
        ...data,
        isTyping: true,
      });
    }
  });

  socket.on("typing_stop", (data) => {
    const { channel } = data;
    if (channel) {
      socket.to(`channel:${channel}`).emit("user_typing", {
        ...data,
        isTyping: false,
      });
    }
  });

  // Get channel activity (for unread indicators)
  socket.on("get_channel_activity", () => {
    const activity = {};
    chatChannels.forEach((channelData, channelName) => {
      activity[channelName] = {
        lastActivity: channelData.lastActivity,
        messageCount: channelData.messages.length,
        userCount: channelData.users.size,
      };
    });
    socket.emit("channel_activity", activity);
  });

  // Message reactions
  socket.on("add_reaction", (data) => {
    const { messageId, channel, emoji, userId, userName } = data;

    if (!channel || !chatChannels.has(channel)) {
      socket.emit("error", { message: "Invalid channel" });
      return;
    }

    const channelData = chatChannels.get(channel);
    const message = channelData.messages.find((m) => m.id === messageId);

    if (!message) {
      socket.emit("error", { message: "Message not found" });
      return;
    }

    // Initialize reactions array if needed
    if (!message.reactions) {
      message.reactions = [];
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.emoji === emoji && r.userId === userId
    );

    if (existingReaction) {
      // Remove reaction if already exists (toggle)
      message.reactions = message.reactions.filter(
        (r) => !(r.emoji === emoji && r.userId === userId)
      );
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });
    }

    // Broadcast updated message to channel
    io.to(`channel:${channel}`).emit("message_reaction_updated", {
      messageId,
      channel,
      reactions: message.reactions,
    });
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);

    // Remove user from chat
    const chatUser = chatUsers.get(socket.id);
    if (chatUser) {
      // Update last seen before removing
      chatUser.lastSeen = new Date().toISOString();

      // Remove from all channels
      const userChannelsSet = userChannels.get(socket.id);
      if (userChannelsSet) {
        userChannelsSet.forEach((channelName) => {
          const channelData = chatChannels.get(channelName);
          if (channelData && chatUser.userId) {
            channelData.users.delete(chatUser.userId);
            // Update last seen in channel
            const userInChannel = channelData.users.get(chatUser.userId);
            if (userInChannel) {
              userInChannel.lastSeen = new Date().toISOString();
            }

            // Notify others in channel
            socket.to(`channel:${channelName}`).emit("user_left_channel", {
              userId: chatUser.userId,
              channel: channelName,
              timestamp: new Date().toISOString(),
            });

            // Broadcast updated user list
            io.to(`channel:${channelName}`).emit("channel_users_updated", {
              channel: channelName,
              users: Array.from(channelData.users.values()),
              userCount: channelData.users.size,
            });
          }
        });
      }

      chatUsers.delete(socket.id);
      userChannels.delete(socket.id);
      socket.broadcast.emit("user_left", chatUser);
    }

    // Remove user from all collaborative rooms
    collaborativeRooms.forEach((room, roomId) => {
      const userToRemove = Array.from(room.participants.values()).find(
        (p) => p.socketId === socket.id
      );

      if (userToRemove) {
        room.removeParticipant(userToRemove.userId);

        // Notify others of participant leaving
        socket.to(roomId).emit("participant_left", {
          userId: userToRemove.userId,
          userName: userToRemove.userName,
          timestamp: new Date().toISOString(),
        });
        // Broadcast updated participant list
        socket.to(roomId).emit("participants_updated", {
          participants: room.getParticipantsList(),
        });
        // Broadcast unlocked fields
        socket.to(roomId).emit("user_fields_unlocked", {
          userId: userToRemove.userId,
        });
      }
    });
  });

  // Basic ping/pong for connection testing
  socket.on("ping", (data) => {
    socket.emit("pong", {
      ...data,
      serverTimestamp: new Date().toISOString(),
    });
  });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(
    `🌐 CORS: ${
      isDevelopment ? "All origins allowed (development)" : "Restricted origins"
    }`
  );
  console.log(`\n💡 To connect from mobile device:`);
  console.log(
    `   Set EXPO_PUBLIC_SOCKET_URL=http://YOUR_IP:${PORT} in your .env file`
  );
  console.log(`   Find your IP: ifconfig (Mac/Linux) or ipconfig (Windows)\n`);
});
