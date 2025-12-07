import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { useSocket } from "../hooks/useSocket";
import { databaseService, Task } from "../services/database";
export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const { isConnected, emit } = useSocket();
  // Initialize database and load data
  useEffect(() => {
    initializeApp();
  }, []);
  const initializeApp = async () => {
    try {
      setLoading(true);
      await databaseService.initializeDatabase();
      const existingTasks = await databaseService.getAllTasks();
      setTasks(existingTasks);
    } catch (error) {
      console.error("App initialization error:", error);
      Alert.alert("Error", "Failed to initialize app. Please restart.");
    } finally {
      setLoading(false);
    }
  };
  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const newTask = await databaseService.addTask(newTaskTitle);
      setTasks([newTask, ...tasks]);
      setNewTaskTitle("");
      // Emit real-time event (for future lessons)
      if (isConnected) {
        emit("task_created", {
          task: newTask,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error adding task:", error);
      Alert.alert("Error", "Failed to add task. Please try again.");
    }
  };
  const toggleTask = async (id: string) => {
    try {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      await databaseService.updateTask(id, { completed: !task.completed });

      setTasks(
        tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
      // Emit real-time event (for future lessons)
      if (isConnected) {
        emit("task_updated", {
          taskId: id,
          completed: !task.completed,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Failed to update task. Please try again.");
    }
  };
  const deleteTask = (id: string) => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await databaseService.deleteTask(id);
            setTasks(tasks.filter((t) => t.id !== id));
            // Emit real-time event (for future lessons)
            if (isConnected) {
              emit("task_deleted", {
                taskId: id,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error("Error deleting task:", error);
            Alert.alert("Error", "Failed to delete task. Please try again.");
          }
        },
      },
    ]);
  };
  // Show loading spinner while initializing
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">
          Loading your tasks...
        </Text>
      </View>
    );
  }
  const renderTask = ({ item }: { item: Task }) => (
    <View className="bg-white dark:bg-gray-800 rounded-xl mb-2 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <TouchableOpacity
        className="flex-row items-center justify-between"
        onPress={() => toggleTask(item.id)}
      >
        <View className="flex-1">
          <Text
            className={`text-base ${
              item.completed
                ? "text-gray-500 dark:text-gray-400 line-through"
                : "text-gray-800 dark:text-white"
            }`}
          >
            {item.title}
          </Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View className="flex-row items-center">
          <View
            className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
              item.completed
                ? "bg-green-500 border-green-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {item.completed && <Text className="text-white text-xs">✓</Text>}
          </View>

          <TouchableOpacity
            className="p-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full"
            onPress={() => deleteTask(item.id)}
          >
            <Text className="text-red-500 text-lg">🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 px-5 pt-16 md:px-8 lg:px-12 max-w-4xl mx-auto">
      {/* Connection Status - Prominently displayed at top */}
      <ConnectionStatus />
      
      <Text className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800 dark:text-white">
        Task Manager
      </Text>

      <View className="flex-row mb-5 md:mb-6">
        <TextInput
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3 md:p-4 bg-white dark:bg-gray-800 text-base dark:text-white mr-2 md:mr-3"
          placeholder="Add a new task..."
          placeholderTextColor="#9CA3AF"
          value={newTaskTitle}
          onChangeText={setNewTaskTitle}
          onSubmitEditing={addTask}
        />
        <TouchableOpacity
          className="bg-blue-500 rounded-lg px-5 py-3 md:px-6 md:py-4 justify-center active:bg-blue-600"
          onPress={addTask}
        >
          <Text className="text-white font-semibold text-base">Add</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      />
      <View className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Text className="text-center text-blue-700 dark:text-blue-300 text-sm font-medium">
          {tasks.length} total tasks •{" "}
          {tasks.filter((t) => !t.completed).length} pending
          {isConnected && (
            <Text className="text-green-600 dark:text-green-400">
              {" "}
              • Live sync enabled
            </Text>
          )}
        </Text>
      </View>
    </View>
  );
}
