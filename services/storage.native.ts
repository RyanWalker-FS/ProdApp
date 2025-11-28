import { Task } from "@/types/Task";

// We avoid a static top-level import of `expo-sqlite` so Metro doesn't fail
// at bundle-time when the optional native dependency isn't installed.
// Use a runtime loader (via eval("require")) to prevent static analysis
// from attempting to resolve the module.

type SQLResult = { rows: { _array: any[] } } & any;

class NativeStorageService {
  private db: any | null = null;
  private DB_NAME = "connectedtech.db";
  private usingSqlite = false;
  // Simple in-memory fallback when expo-sqlite isn't available.
  private memoryStore: Task[] = [];

  private execSql(sql: string, params: any[] = []): Promise<SQLResult> {
    if (!this.db) return Promise.reject(new Error("Database not initialized"));
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_tx: any, result: any) => resolve(result as SQLResult),
          (_tx: any, err: any) => {
            // eslint-disable-next-line no-console
            console.error("SQL error", err, sql, params);
            reject(err);
            return false;
          }
        );
      });
    });
  }

  // Initialize either the SQLite DB (if available) or the memory fallback.
  async init(): Promise<void> {
    if (this.db || this.usingSqlite) return;

    // Attempt to load expo-sqlite at runtime without letting Metro statically
    // resolve it during bundling. eval('require') avoids static analysis.
    let sqlite: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      sqlite = eval("require")("expo-sqlite");
    } catch (e) {
      // Not available — fall back to memory store.
      // eslint-disable-next-line no-console
      console.warn(
        "expo-sqlite not found. Using in-memory storage. To enable native persistence, run: npx expo install expo-sqlite"
      );
    }

    if (sqlite && typeof sqlite.openDatabase === "function") {
      this.usingSqlite = true;
      this.db = sqlite.openDatabase(this.DB_NAME);
      // Create table if needed
      await this.execSql(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          completed INTEGER DEFAULT 0,
          priority TEXT DEFAULT 'Medium',
          createdAt TEXT NOT NULL
        );
      `);
      await this.execSql(
        `CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks(createdAt);`
      );
    } else {
      // memory fallback: initialize empty array (already set in constructor)
      this.usingSqlite = false;
      this.db = null;
    }
  }

  async getAllTasks(): Promise<Task[]> {
    if (this.usingSqlite) {
      const res = await this.execSql(
        "SELECT * FROM tasks ORDER BY datetime(createdAt) DESC"
      );
      const rows = res.rows._array || [];
      return rows.map((r: any) => ({
        id: String(r.id),
        title: r.title,
        description: r.description,
        completed: Boolean(r.completed),
        createdAt: new Date(r.createdAt),
        priority: r.priority,
      }));
    }

    // memory fallback: return a copy sorted by createdAt desc
    return [...this.memoryStore].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task> {
    if (this.usingSqlite) {
      const id = Date.now().toString();
      const now = new Date().toISOString();
      await this.execSql(
        "INSERT INTO tasks (id, title, description, completed, priority, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        [
          id,
          task.title,
          task.description || "",
          task.completed ? 1 : 0,
          task.priority || "Medium",
          now,
        ]
      );
      return {
        id,
        title: task.title,
        description: task.description || "",
        completed: task.completed,
        createdAt: new Date(now),
        priority: task.priority,
      } as Task;
    }

    // memory fallback
    const id = Date.now().toString();
    const createdAt = new Date();
    const newTask: Task = {
      id,
      title: task.title,
      description: task.description || "",
      completed: task.completed,
      createdAt,
      priority: task.priority,
    } as Task;
    this.memoryStore.push(newTask);
    return newTask;
  }

  async updateTask(updated: Task): Promise<Task> {
    if (this.usingSqlite) {
      await this.execSql(
        "UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ? WHERE id = ?",
        [
          updated.title,
          updated.description || "",
          updated.completed ? 1 : 0,
          updated.priority || "Medium",
          updated.id,
        ]
      );
      return updated;
    }

    const idx = this.memoryStore.findIndex((t) => t.id === updated.id);
    if (idx >= 0) {
      this.memoryStore[idx] = { ...this.memoryStore[idx], ...updated };
    }
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    if (this.usingSqlite) {
      await this.execSql("DELETE FROM tasks WHERE id = ?", [id]);
      return true;
    }

    this.memoryStore = this.memoryStore.filter((t) => t.id !== id);
    return true;
  }
}

export default new NativeStorageService();
