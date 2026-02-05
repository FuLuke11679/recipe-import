import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing, typography } from "../theme";

interface StepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onIncrement,
  onDecrement,
  min = 1,
  max = 20,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, value <= min && styles.buttonDisabled]}
        onPress={onDecrement}
        disabled={value <= min}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, value <= min && styles.buttonTextDisabled]}>−</Text>
      </TouchableOpacity>
      <View style={styles.valueContainer}>
        <Text style={styles.valueText}>{value}</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, value >= max && styles.buttonDisabled]}
        onPress={onIncrement}
        disabled={value >= max}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, value >= max && styles.buttonTextDisabled]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.title,
    fontSize: 24,
    color: colors.textPrimary,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  valueContainer: {
    minWidth: 60,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  valueText: {
    ...typography.title,
    fontSize: 20,
  },
});
