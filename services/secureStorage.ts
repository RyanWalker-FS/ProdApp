import { Platform } from "react-native";

type MemoryStore = Map<string, string>;

class SecureStorageService {
  private memory: MemoryStore = new Map();

  private async getSecureStoreModule() {
    try {
      // dynamic import to avoid failing on web if module isn't installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import("expo-secure-store");
      return mod;
    } catch (e) {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        localStorage.setItem(key, value);
      }
      return;
    }

    const mod = await this.getSecureStoreModule();
    if (mod && mod.setItemAsync) {
      try {
        await mod.setItemAsync(key, value);
        return;
      } catch (e) {
        // fall through to memory
      }
    }

    // fallback
    this.memory.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    }

    const mod = await this.getSecureStoreModule();
    if (mod && mod.getItemAsync) {
      try {
        return await mod.getItemAsync(key);
      } catch (e) {
        // fall through
      }
    }

    return this.memory.get(key) ?? null;
  }

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        sessionStorage.removeItem(key);
      } catch {
        localStorage.removeItem(key);
      }
      return;
    }

    const mod = await this.getSecureStoreModule();
    if (mod && mod.deleteItemAsync) {
      try {
        await mod.deleteItemAsync(key);
        return;
      } catch (e) {
        // fall through
      }
    }

    this.memory.delete(key);
  }
}

export default new SecureStorageService();
