import { useTasks } from "@/components/TaskProvider";
import { useTheme } from "@react-navigation/native";
import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function TasksScreen() {
  const { tasks, toggleTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState<"all" | "completed" | "incomplete">(
    "all"
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let out = tasks;
    if (filter === "completed") out = out.filter((t) => t.completed);
    if (filter === "incomplete") out = out.filter((t) => !t.completed);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return out;
  }, [tasks, filter, search]);
  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const priorityColor = (p: string | undefined) => {
    switch (p) {
      case "High":
        return "#FF3B30"; // red
      case "Medium":
        return "#FF9500"; // orange
      case "Low":
        return "#34C759"; // green
      default:
        return "#8E8E93"; // gray
    }
  };

  const confirmDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this task?")) deleteTask(id);
      return;
    }
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTask(id) },
    ]);
  };

  const renderTask = ({ item }: { item: any }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => toggleTask(item.id)}>
        <View style={styles.taskContent}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: priorityColor(item.priority),
                marginRight: 8,
              }}
            />
            <Text
              style={[styles.taskTitle, item.completed && styles.completedTask]}
            >
              {item.title}
            </Text>
          </View>
          <Text style={styles.taskDescription}>{item.description}</Text>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          style={{ marginRight: 8 }}
          onPress={() =>
            router.push({ pathname: "/edit-task", params: { id: item.id } })
          }
        >
          <Text style={{ color: "#007AFF" }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDelete(item.id)}>
          <Text style={{ color: "#FF3B30" }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: (colors as any).card || colors.background },
        ]}
      >
        <View>
          <Text style={[styles.statsText, { color: colors.text }]}>
            Total: {total}
          </Text>
          <Text style={[styles.statsText, { color: colors.text }]}>
            Completed: {completedCount}
          </Text>
        </View>
        <Link href="/settings" asChild>
          <TouchableOpacity>
            <Text style={{ color: colors.primary }}>Settings</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks"
          placeholderTextColor={colors.text}
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: (colors as any).border || "#ddd",
            },
          ]}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity onPress={() => setFilter("all")}>
          <Text
            style={{ color: filter === "all" ? colors.primary : colors.text }}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter("completed")}>
          <Text
            style={{
              color: filter === "completed" ? colors.primary : colors.text,
            }}
          >
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter("incomplete")}>
          <Text
            style={{
              color: filter === "incomplete" ? colors.primary : colors.text,
            }}
          >
            Incomplete
          </Text>
        </TouchableOpacity>
      </View>

      <Link href="/app-task" asChild>
        <TouchableOpacity
          style={StyleSheet.flatten([
            styles.addButton,
            { backgroundColor: colors.primary },
          ])}
        >
          <Text style={[styles.addButtonText, { color: colors.background }]}>
            + Add Task
          </Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  list: {
    flex: 1,
    padding: 16,
  },
  taskItem: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  completedTask: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
  },
  taskStatus: {
    fontSize: 24,
  },
  addButton: {
    backgroundColor: "#007AFF",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  statsText: {
    fontSize: 14,
    color: "#333",
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
  },
  searchInput: {
    backgroundColor: "white",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
});
