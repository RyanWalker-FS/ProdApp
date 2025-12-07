export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  delivered: boolean;
  channel: string; // Channel name (e.g., "general", "development", "random")
  mentions?: string[]; // Array of user IDs mentioned in the message
  reactions?: MessageReaction[]; // Array of reactions on the message
}

