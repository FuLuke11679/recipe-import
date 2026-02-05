import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../theme";
import { PrimaryButton } from "./PrimaryButton";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <View style={styles.buttonWrapper}>
          <PrimaryButton title="Retry" onPress={onRetry} />
        </View>
      )}
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
  message: {
    ...typography.body,
    color: colors.error,
    textAlign: "center",
  },
  buttonWrapper: {
    marginTop: spacing.md,
  },
});
