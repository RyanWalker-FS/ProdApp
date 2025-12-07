import { Platform } from "react-native";
import SecureStorage from "./secureStorage";

const USER_ID_KEY = "chat_user_id";
const USER_NAME_KEY = "chat_user_name";

export interface UserIdentity {
  userId: string;
  userName: string;
}

class UserService {
  private cachedUser: UserIdentity | null = null;

  async getOrCreateUser(): Promise<UserIdentity> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    // Try to get existing user
    const existingUserId = await SecureStorage.getItem(USER_ID_KEY);
    const existingUserName = await SecureStorage.getItem(USER_NAME_KEY);

    if (existingUserId && existingUserName) {
      this.cachedUser = {
        userId: existingUserId,
        userName: existingUserName,
      };
      return this.cachedUser;
    }

    // Create new user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userName = `User ${userId.slice(-4)}`;

    await SecureStorage.setItem(USER_ID_KEY, userId);
    await SecureStorage.setItem(USER_NAME_KEY, userName);

    this.cachedUser = { userId, userName };
    return this.cachedUser;
  }

  async updateUserName(userName: string): Promise<void> {
    await SecureStorage.setItem(USER_NAME_KEY, userName);
    if (this.cachedUser) {
      this.cachedUser.userName = userName;
    }
  }

  async getUser(): Promise<UserIdentity | null> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    const userId = await SecureStorage.getItem(USER_ID_KEY);
    const userName = await SecureStorage.getItem(USER_NAME_KEY);

    if (userId && userName) {
      this.cachedUser = { userId, userName };
      return this.cachedUser;
    }

    return null;
  }

  clearCache(): void {
    this.cachedUser = null;
  }
}

export const userService = new UserService();

