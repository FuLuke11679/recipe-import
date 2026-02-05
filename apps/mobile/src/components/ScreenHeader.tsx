import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../theme";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack, rightElement }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      {onBack ? (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} style={styles.backIcon} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {rightElement ? (
        <View style={styles.rightElement}>{rightElement}</View>
      ) : (
        <View style={styles.backButton} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    minWidth: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    marginRight: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontSize: 16,
  },
  headerTitle: {
    ...typography.title,
    flex: 1,
    textAlign: "center",
  },
  rightElement: {
    minWidth: 60,
    alignItems: "flex-end",
  },
});
