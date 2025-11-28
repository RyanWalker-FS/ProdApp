export type Priority = "High" | "Medium" | "Low";

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
  // optional priority for practice extension
  priority?: Priority;
}
