import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

interface CollaborativeTaskItemProps {
  task: Task;
  currentUserId: string;
  isLocked?: boolean;
  lockedBy?: string;
  onUpdate: (taskId: string, updates: any) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onRequestEditLock: (field: string) => Promise<boolean>;
  onReleaseEditLock: (field: string) => Promise<void>;
}

export const CollaborativeTaskItem: React.FC<CollaborativeTaskItemProps> = ({
  task,
  currentUserId,
  isLocked = false,
  lockedBy,
  onUpdate,
  onDelete,
  onRequestEditLock,
  onReleaseEditLock,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.title);
  const [hasEditLock, setHasEditLock] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleStartEdit = async () => {
    if (isLocked && lockedBy !== currentUserId) {
      if (Platform.OS === "web") {
        alert(
          `This task is currently being edited by ${lockedBy}. Please try again later.`
        );
      } else {
        Alert.alert(
          "Task Being Edited",
          `This task is currently being edited by ${lockedBy}. Please try again later.`,
          [{ text: "OK" }]
        );
      }
      return;
    }

    const lockObtained = await onRequestEditLock(`task_${task.id}_title`);

    if (lockObtained) {
      setHasEditLock(true);
      setIsEditing(true);
      setEditText(task.title);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      if (Platform.OS === "web") {
        alert("This task is being edited by another user.");
      } else {
        Alert.alert("Cannot Edit", "This task is being edited by another user.", [
          { text: "OK" },
        ]);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && editText !== task.title) {
      await onUpdate(task.id, { title: editText.trim() });
    }

    await handleCancelEdit();
  };

  const handleCancelEdit = async () => {
    setIsEditing(false);
    setEditText(task.title);

    if (hasEditLock) {
      await onReleaseEditLock(`task_${task.id}_title`);
      setHasEditLock(false);
    }
  };

  const handleToggleComplete = async () => {
    await onUpdate(task.id, { completed: !task.completed });
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this task?")) {
        onDelete(task.id);
      }
    } else {
      Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(task.id),
        },
      ]);
    }
  };

  const isModifiedByOther =
    task.lastModifiedBy && task.lastModifiedBy !== currentUserId;

  return (
    <View
      style={[
        styles.container,
        isLocked && lockedBy !== currentUserId && styles.lockedContainer,
      ]}
    >
      {/* Lock indicator */}
      {isLocked && lockedBy !== currentUserId && (
        <View style={styles.lockIndicator}>
          <View style={styles.lockDot} />
          <Text style={styles.lockText}>Being edited by {lockedBy}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.taskContent}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                ref={inputRef}
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                onSubmitEditing={handleSaveEdit}
                onBlur={handleCancelEdit}
                multiline
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onLongPress={handleStartEdit}
              onPress={handleToggleComplete}
              disabled={isLocked && lockedBy !== currentUserId}
              style={styles.taskTextContainer}
            >
              <Text
                style={[
                  styles.taskTitle,
                  task.completed && styles.completedTask,
                ]}
              >
                {task.title}
              </Text>
              {isModifiedByOther && (
                <Text style={styles.modifiedBy}>
                  Modified by {task.lastModifiedBy} •{" "}
                  {task.lastModifiedAt &&
                    new Date(task.lastModifiedAt).toLocaleTimeString()}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          <View
            style={[
              styles.checkbox,
              task.completed && styles.checkboxCompleted,
            ]}
          >
            {task.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={isLocked && lockedBy !== currentUserId}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  lockedContainer: {
    borderColor: "#fbbf24",
    backgroundColor: "#fffbeb",
  },
  lockIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#fef3c7",
  },
  lockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
    marginRight: 8,
  },
  lockText: {
    fontSize: 12,
    color: "#92400e",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskContent: {
    flex: 1,
    marginRight: 12,
  },
  taskTextContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 4,
  },
  completedTask: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  modifiedBy: {
    fontSize: 12,
    color: "#3b82f6",
    marginTop: 4,
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    borderBottomWidth: 1,
    borderBottomColor: "#3b82f6",
    paddingBottom: 4,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
});

