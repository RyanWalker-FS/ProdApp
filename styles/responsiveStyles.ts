import { Dimensions, Platform } from "react-native";
export const getResponsiveStyles = () => {
  if (Platform.OS !== "web") return {};

  const { width } = Dimensions.get("window");

  if (width > 768) {
    // Desktop styles
    return {
      container: { padding: 24, maxWidth: 1200 },
      columns: { flexDirection: "row", flexWrap: "wrap" },
    };
  } else {
    // Mobile web styles
    return {
      container: { padding: 16 },
      columns: { flexDirection: "column" },
    };
  }
};
