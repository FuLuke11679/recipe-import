import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { spacing, typography, colors } from "../theme";
import { Step } from "../../../packages/shared/types";

interface RecipeStepsListProps {
  steps: Step[];
}

export const RecipeStepsList: React.FC<RecipeStepsListProps> = ({ steps }) => {
  // Debug logging (remove in production if needed)
  React.useEffect(() => {
    if (steps) {
      console.log("RecipeStepsList: Received steps:", steps.length, steps);
    } else {
      console.log("RecipeStepsList: No steps provided");
    }
  }, [steps]);

  // Handle empty or undefined steps
  if (!steps || steps.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Steps</Text>
        <Text style={styles.emptyText}>No steps available for this recipe.</Text>
      </View>
    );
  }

  // Sort steps by order to ensure correct display
  const sortedSteps = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Steps</Text>
      <FlatList
        data={sortedSteps}
        keyExtractor={(item, index) => `step-${item.order || index}`}
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <View style={styles.numberContainer}>
              <Text style={styles.number}>{item.order || index + 1}</Text>
            </View>
            <Text style={styles.text}>{item.instruction || "No instruction provided"}</Text>
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.section,
    marginBottom: spacing.md,
  },
  item: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  numberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  number: {
    ...typography.body,
    color: colors.white,
    fontWeight: "600",
  },
  text: {
    ...typography.body,
    flex: 1,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: "italic",
    paddingVertical: spacing.md,
  },
});
