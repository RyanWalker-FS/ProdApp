import { Platform } from "react-native";
import config from "../constants/config";
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiUrl;
  }

  private log(message: string, data?: any) {
    if (config.enableLogging) {
      console.log(`[API] ${message}`, data);
    }
  }

  async fetchTasks() {
    this.log("Fetching tasks");

    // Platform-specific API endpoints
    const endpoint =
      Platform.OS === "web" ? "/api/web/tasks" : "/api/mobile/tasks";

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      const tasks = await response.json();
      this.log("Tasks fetched successfully", tasks);
      return tasks;
    } catch (error) {
      this.log("Error fetching tasks", error);
      throw error;
    }
  }

  async saveTask(task: any) {
    this.log("Saving task", task);

    const endpoint =
      Platform.OS === "web" ? "/api/web/tasks" : "/api/mobile/tasks";

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(task),
      });

      const savedTask = await response.json();
      this.log("Task saved successfully", savedTask);
      return savedTask;
    } catch (error) {
      this.log("Error saving task", error);
      throw error;
    }
  }
}
export default new ApiService();
