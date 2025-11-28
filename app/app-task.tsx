import { useTasks } from "@/components/TaskProvider";
import { Priority } from "@/types/Task";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
export default function AddTaskScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority | undefined>("Medium");
  const { addTask } = useTasks();
  const { colors } = useTheme();
  const handleSave = () => {
    if (title.trim()) {
      addTask({ title, description, completed: false, priority });
      router.back();
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: (colors as any).border || "#ddd",
            },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter task title"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter task description"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {(["High", "Medium", "Low"] as Priority[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPriority(p)}
              style={{ padding: 8 }}
            >
              <Text style={{ color: priority === p ? "#007AFF" : "#333" }}>
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
});
