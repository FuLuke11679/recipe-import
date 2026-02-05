import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../theme";

interface ChipToggleProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const ChipToggle: React.FC<ChipToggleProps> = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
