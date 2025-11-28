import { Href, router } from "expo-router";
import { Platform } from "react-native";
export const handleNavigation = (route: Href) => {
  if (Platform.OS === "web") {
    // Web: Update URL for better UX
    window.history.pushState(null, "", String(route));
  }
  router.push(route);
};
/*
Usage example (in a component file):

import { TouchableOpacity, Text } from 'react-native';
import { handleNavigation } from '@/utils/handleNavigation';

// Replace Link + TouchableOpacity with:
// <TouchableOpacity
//   style={styles.addButton}
//   onPress={() => handleNavigation('/add-task')}
// >
//   <Text style={styles.addButtonText}>+ Add Task</Text>
// </TouchableOpacity>

*/
