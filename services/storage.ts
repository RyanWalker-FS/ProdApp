import { Platform } from "react-native";

// Expose a consistent interface for storage. Dynamically import platform
// specific implementations so web/native differences are isolated.

import type { Task } from "@/types/Task";

type StorageService = {
  init(): Promise<void>;
  getAllTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task>;
  updateTask(task: Task): Promise<Task>;
  deleteTask(id: string): Promise<boolean>;
};

let impl: StorageService | null = null;

async function getImpl(): Promise<StorageService> {
  if (impl) return impl;
  if (Platform.OS === "web") {
    const mod = await import("./storage.web");
    impl = mod.default as StorageService;
  } else {
    try {
      const mod = await import("./storage.native");
      impl = mod.default as StorageService;
    } catch (e) {
      // Fallback to web storage if dynamic import fails
      const mod = await import("./storage.web");
      impl = mod.default as StorageService;
    }
  }
  return impl!;
}

export default {
  async init() {
    const s = await getImpl();
    return s.init();
  },
  async getAllTasks() {
    const s = await getImpl();
    return s.getAllTasks();
  },
  async createTask(task: Omit<Task, "id" | "createdAt">) {
    const s = await getImpl();
    return s.createTask(task);
  },
  async updateTask(task: Task) {
    const s = await getImpl();
    return s.updateTask(task);
  },
  async deleteTask(id: string) {
    const s = await getImpl();
    return s.deleteTask(id);
  },
};
