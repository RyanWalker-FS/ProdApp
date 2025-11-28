import storage from "@/services/storage";
import { Task } from "@/types/Task";
import React, { createContext, useContext, useEffect, useState } from "react";

interface TasksContextValue {
  tasks: Task[];
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (updated: Task) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export const useTasks = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within a TasksProvider");
  return ctx;
};

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await storage.init();
        const all = await storage.getAllTasks();
        if (mounted)
          setTasks(
            all.map((t) => ({ ...t, createdAt: new Date(t.createdAt) }))
          );
      } catch (e) {
        // fallback: keep empty list
        // eslint-disable-next-line no-console
        console.error("Failed to initialize storage", e);
      } finally {
        if (mounted) setInitialized(true);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const addTask = (task: Omit<Task, "id" | "createdAt">) => {
    (async () => {
      try {
        const created = await storage.createTask(task);
        setTasks((s) => [created as Task, ...s]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to create task", e);
      }
    })();
  };

  const updateTask = (updated: Task) => {
    (async () => {
      try {
        const out = await storage.updateTask(updated);
        setTasks((s) => s.map((t) => (t.id === out.id ? out : t)));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to update task", e);
      }
    })();
  };

  const deleteTask = (id: string) => {
    (async () => {
      try {
        const ok = await storage.deleteTask(id);
        if (ok) setTasks((s) => s.filter((t) => t.id !== id));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to delete task", e);
      }
    })();
  };

  const toggleTask = (id: string) => {
    (async () => {
      try {
        const current = tasks.find((t) => t.id === id);
        if (!current) return;
        const updated = { ...current, completed: !current.completed };
        const out = await storage.updateTask(updated);
        setTasks((s) => s.map((t) => (t.id === out.id ? out : t)));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to toggle task", e);
      }
    })();
  };

  return (
    <TasksContext.Provider
      value={{ tasks, addTask, updateTask, deleteTask, toggleTask }}
    >
      {children}
    </TasksContext.Provider>
  );
};
