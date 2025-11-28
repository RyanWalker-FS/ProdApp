import { Task } from "@/types/Task";

const TASKS_KEY = "connectedtech_tasks_v1";

function parseTasks(raw: string | null): Task[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as any[];
    return arr.map((t) => ({
      ...t,
      createdAt: new Date(t.createdAt),
    })) as Task[];
  } catch {
    return [];
  }
}

class WebStorageService {
  async init(): Promise<void> {
    // no-op for localStorage
    return;
  }

  private async read(): Promise<Task[]> {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TASKS_KEY)
        : null;
    return parseTasks(raw);
  }

  private async write(tasks: Task[]) {
    if (typeof window === "undefined") return;
    const serializable = tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }));
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(serializable));
  }

  async getAllTasks(): Promise<Task[]> {
    return this.read();
  }

  async createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task> {
    const tasks = await this.read();
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    tasks.unshift(newTask);
    await this.write(tasks);
    return newTask;
  }

  async updateTask(updated: Task): Promise<Task> {
    const tasks = await this.read();
    const idx = tasks.findIndex((t) => t.id === updated.id);
    if (idx === -1) throw new Error("Task not found");
    tasks[idx] = { ...updated };
    await this.write(tasks);
    return tasks[idx];
  }

  async deleteTask(id: string): Promise<boolean> {
    const tasks = await this.read();
    const filtered = tasks.filter((t) => t.id !== id);
    await this.write(filtered);
    return filtered.length < tasks.length;
  }
}

export default new WebStorageService();
