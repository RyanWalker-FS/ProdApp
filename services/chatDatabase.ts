import { ChatMessage } from "@/types/ChatMessage";
import { Platform } from "react-native";

export type { ChatMessage };

class ChatDatabaseService {
  private db: any = null;

  async initializeDatabase(): Promise<void> {
    // Only use SQLite on native platforms
    if (Platform.OS === "web") {
      // Web platform will use chatDatabase.web.ts
      return;
    }

    // Dynamic import to avoid loading SQLite on web
    const SQLite = await import("expo-sqlite");
    this.db = await SQLite.openDatabaseAsync("chat.db");
    // Create table if it doesn't exist
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        delivered INTEGER DEFAULT 0,
        channel TEXT NOT NULL DEFAULT 'general',
        mentions TEXT
      );
    `);

    // Check for schema migrations: ensure `channel` column exists for older DBs
    try {
      const pragmaRows = await this.db.getAllAsync(
        "PRAGMA table_info(messages)"
      );
      const hasChannel = Array.isArray(pragmaRows)
        ? pragmaRows.some(
            (r: any) => r && (r.name === "channel" || r.name === "CHANNEL")
          )
        : false;

      if (!hasChannel) {
        // Add the channel column with a default value so older DBs are compatible
        await this.db.execAsync(
          "ALTER TABLE messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'general';"
        );
        console.log("Migrated messages table: added `channel` column");
      }
      // Ensure `mentions` column exists for older DBs
      const hasMentions = Array.isArray(pragmaRows)
        ? pragmaRows.some(
            (r: any) => r && (r.name === "mentions" || r.name === "MENTIONS")
          )
        : false;

      if (!hasMentions) {
        // Add the mentions column; allow NULLs for compatibility
        await this.db.execAsync(
          "ALTER TABLE messages ADD COLUMN mentions TEXT DEFAULT NULL;"
        );
        console.log("Migrated messages table: added `mentions` column");
      }
    } catch (err) {
      // If PRAGMA or ALTER fails, log and continue — application can still function, but queries
      // referencing `channel` will error until migration is applied. Rethrow to make the failure visible.
      console.error("Error checking/migrating messages table schema:", err);
      throw err;
    }
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    if (Platform.OS === "web") {
      // Web platform will use chatDatabase.web.ts
      return;
    }

    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync(
      `
      INSERT OR REPLACE INTO messages (id, userId, userName, text, timestamp, delivered, channel, mentions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        message.id,
        message.userId,
        message.userName,
        message.text,
        message.timestamp,
        message.delivered ? 1 : 0,
        message.channel || "general",
        message.mentions ? JSON.stringify(message.mentions) : null,
      ]
    );
  }

  async getAllMessages(channel?: string): Promise<ChatMessage[]> {
    if (Platform.OS === "web") {
      // Web platform will use chatDatabase.web.ts
      return [];
    }

    if (!this.db) throw new Error("Database not initialized");

    let query = "SELECT * FROM messages";
    const params: any[] = [];

    if (channel) {
      query += " WHERE channel = ?";
      params.push(channel);
    }

    query += " ORDER BY timestamp ASC";

    const result = await this.db.getAllAsync(query, params);

    return (result as any[]).map((row: any) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      text: row.text,
      timestamp: row.timestamp,
      delivered: Boolean(row.delivered),
      channel: row.channel || "general",
      mentions: row.mentions ? JSON.parse(row.mentions) : undefined,
    }));
  }

  async searchMessages(
    channel: string,
    searchText: string
  ): Promise<ChatMessage[]> {
    if (Platform.OS === "web") {
      return [];
    }

    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getAllAsync(
      "SELECT * FROM messages WHERE channel = ? AND (text LIKE ? OR userName LIKE ?) ORDER BY timestamp DESC LIMIT 50",
      [channel, `%${searchText}%`, `%${searchText}%`]
    );

    return (result as any[]).map((row: any) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      text: row.text,
      timestamp: row.timestamp,
      delivered: Boolean(row.delivered),
      channel: row.channel || "general",
      mentions: row.mentions ? JSON.parse(row.mentions) : undefined,
    }));
  }

  async deleteAllMessages(): Promise<void> {
    if (Platform.OS === "web") {
      // Web platform will use chatDatabase.web.ts
      return;
    }

    if (!this.db) throw new Error("Database not initialized");
    await this.db.execAsync("DELETE FROM messages");
  }
}

export const chatDatabase = new ChatDatabaseService();
