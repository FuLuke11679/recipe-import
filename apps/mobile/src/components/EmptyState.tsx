import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../theme";

interface EmptyStateProps {
  message: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, subtitle }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="list-outline" size={48} color={colors.textSecondary} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  icon: {
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
  },
});
