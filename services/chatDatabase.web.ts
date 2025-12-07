import { ChatMessage } from "@/types/ChatMessage";

const MESSAGES_KEY = "connectedtech_chat_messages_v2"; // Updated version for channel support

class ChatDatabaseService {
  async initializeDatabase(): Promise<void> {
    // localStorage is always available on web, no initialization needed
    return;
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    const messages = await this.getAllMessages();
    
    // Remove existing message with same ID if present
    const filtered = messages.filter((m) => m.id !== message.id);
    
    // Add new message with channel
    const messageWithChannel = {
      ...message,
      channel: message.channel || "general",
    };
    filtered.push(messageWithChannel);
    
    // Sort by timestamp
    filtered.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(filtered));
    }
  }

  async getAllMessages(channel?: string): Promise<ChatMessage[]> {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(MESSAGES_KEY);
    if (!raw) {
      return [];
    }

    try {
      const messages = JSON.parse(raw) as ChatMessage[];
      if (channel) {
        return messages.filter((m) => m.channel === channel);
      }
      return messages;
    } catch {
      return [];
    }
  }

  async searchMessages(channel: string, searchText: string): Promise<ChatMessage[]> {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(MESSAGES_KEY);
    if (!raw) {
      return [];
    }

    try {
      const messages = JSON.parse(raw) as ChatMessage[];
      const lowerSearch = searchText.toLowerCase();
      return messages
        .filter(
          (m) =>
            m.channel === channel &&
            (m.text.toLowerCase().includes(lowerSearch) ||
              m.userName.toLowerCase().includes(lowerSearch))
        )
        .slice(-50)
        .reverse();
    } catch {
      return [];
    }
  }

  async deleteAllMessages(): Promise<void> {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(MESSAGES_KEY);
    }
  }
}

export const chatDatabase = new ChatDatabaseService();

