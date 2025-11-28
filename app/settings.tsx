import secureStorage from "@/services/secureStorage";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ThemePref = "system" | "light" | "dark";

export default function SettingsScreen() {
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<ThemePref>("system");
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedName = await secureStorage.getItem("user_name");
        const savedTheme = await secureStorage.getItem("app_theme");
        if (!mounted) return;
        if (savedName) setName(savedName);
        if (
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "system"
        ) {
          setTheme(savedTheme as ThemePref);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      await secureStorage.setItem("user_name", name);
      await secureStorage.setItem("app_theme", theme);
      Alert.alert("Saved", "Settings have been saved.");
      router.back();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      Alert.alert("Error", "Failed to save settings.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>Your name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={[
          styles.input,
          {
            backgroundColor: (colors as any).card || colors.background,
            color: colors.text,
            borderColor: (colors as any).border || "#ddd",
          },
        ]}
        placeholder="Enter your name"
        placeholderTextColor={colors.text}
      />

      <Text style={[styles.label, { color: colors.text }]}>Theme</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {(["system", "light", "dark"] as ThemePref[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTheme(t)}
            style={{ padding: 8 }}
          >
            <Text style={{ color: theme === t ? colors.primary : colors.text }}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        onPress={handleSave}
      >
        <Text style={[styles.saveButtonText, { color: colors.background }]}>
          Save Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 12, marginBottom: 8 },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: { color: "white", fontWeight: "700" },
});
