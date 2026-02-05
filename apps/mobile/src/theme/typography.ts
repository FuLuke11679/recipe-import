import { TextStyle } from "react-native";

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: "600" as TextStyle["fontWeight"],
    lineHeight: 34,
    color: "#1F2937",
  },
  section: {
    fontSize: 20,
    fontWeight: "600" as TextStyle["fontWeight"],
    lineHeight: 24,
    color: "#1F2937",
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as TextStyle["fontWeight"],
    lineHeight: 24,
    color: "#1F2937",
  },
  secondary: {
    fontSize: 14,
    fontWeight: "400" as TextStyle["fontWeight"],
    lineHeight: 20,
    color: "#6B7280",
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as TextStyle["fontWeight"],
    lineHeight: 16,
    color: "#6B7280",
  },
};
