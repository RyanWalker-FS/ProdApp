import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Task Manager",
          headerShown: true,
        }}
      />
    </Tabs>
  );
}

