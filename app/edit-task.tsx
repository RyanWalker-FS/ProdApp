import { useTasks } from "@/components/TaskProvider";
import { Priority, Task } from "@/types/Task";
import { useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { tasks, updateTask, deleteTask } = useTasks();
  const [task, setTask] = useState<Task | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const found = tasks.find((t) => t.id === id);
    if (found) {
      setTask(found);
      setTitle(found.title);
      setDescription(found.description);
      setPriority(found.priority as Priority | undefined);
    }
  }, [id, tasks]);

  const handleSave = () => {
    if (!task) return;
    const updated: Task = {
      ...task,
      title,
      description,
      priority,
    };
    updateTask(updated);
    router.back();
  };

  const handleDelete = () => {
    if (!task) return;
    if (Platform.OS === "web") {
      if (window.confirm("Delete this task?")) {
        deleteTask(task.id);
        router.back();
      }
      return;
    }
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTask(task.id);
          router.back();
        },
      },
    ]);
  };

  if (!task) {
    const { colors } = useTheme();
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ padding: 16, color: colors.text }}>Task not found.</Text>
      </View>
    );
  }

  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>Title</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: (colors as any).card || colors.background,
              color: colors.text,
              borderColor: (colors as any).border || "#ddd",
            },
          ]}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={[styles.label, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: (colors as any).card || colors.background,
              color: colors.text,
              borderColor: (colors as any).border || "#ddd",
            },
          ]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {(["High", "Medium", "Low"] as Priority[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPriority(p)}
              style={{ padding: 8 }}
            >
              <Text
                style={{ color: priority === p ? colors.primary : colors.text }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveButtonText, { color: colors.background }]}>
            Save Task
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: "#FF3B30" }]}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Delete Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
