import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../theme";
import { Nutrition } from "../../../packages/shared/types";
import { CollapsibleSection } from "./CollapsibleSection";

interface NutritionInfoProps {
  nutrition: Nutrition | null | undefined;
  servings?: number | null;
}

export const NutritionInfo: React.FC<NutritionInfoProps> = ({ nutrition, servings }) => {
  // Show a message if nutrition data is not available
  if (!nutrition) {
    return (
      <CollapsibleSection title="Nutrition Information" defaultCollapsed={true}>
        <View style={styles.container}>
          <Text style={styles.unavailableText}>
            Nutrition information will be calculated when you extract or adapt this recipe.
          </Text>
        </View>
      </CollapsibleSection>
    );
  }

  const calories = nutrition.calories_per_serving || nutrition.total_calories;
  const hasMacros = nutrition.protein_g || nutrition.carbohydrates_g || nutrition.fat_g;
  const hasDetails = nutrition.fiber_g || nutrition.sugar_g || nutrition.sodium_mg;

  if (!calories && !hasMacros && !hasDetails) {
    return (
      <CollapsibleSection title="Nutrition Information" defaultCollapsed={true}>
        <View style={styles.container}>
          <Text style={styles.unavailableText}>
            Nutrition information is not available for this recipe.
          </Text>
        </View>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Nutrition Information" defaultCollapsed={false}>
      <View style={styles.container}>
        {calories && (
          <View style={styles.section}>
            <Text style={styles.label}>Calories</Text>
            <Text style={styles.value}>
              {nutrition.calories_per_serving
                ? `${Math.round(nutrition.calories_per_serving)} per serving`
                : nutrition.total_calories
                ? `${Math.round(nutrition.total_calories)} total`
                : ""}
            </Text>
          </View>
        )}

        {hasMacros && (
          <View style={styles.macrosContainer}>
            <Text style={styles.macrosTitle}>Macronutrients</Text>
            {nutrition.protein_g && (
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>
                  {nutrition.calories_per_serving
                    ? `${Math.round(nutrition.protein_g)}g per serving`
                    : `${Math.round(nutrition.protein_g)}g total`}
                </Text>
              </View>
            )}
            {nutrition.carbohydrates_g && (
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>
                  {nutrition.calories_per_serving
                    ? `${Math.round(nutrition.carbohydrates_g)}g per serving`
                    : `${Math.round(nutrition.carbohydrates_g)}g total`}
                </Text>
              </View>
            )}
            {nutrition.fat_g && (
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>
                  {nutrition.calories_per_serving
                    ? `${Math.round(nutrition.fat_g)}g per serving`
                    : `${Math.round(nutrition.fat_g)}g total`}
                </Text>
              </View>
            )}
          </View>
        )}

        {hasDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Additional Info</Text>
            {nutrition.fiber_g && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fiber</Text>
                <Text style={styles.detailValue}>
                  {nutrition.calories_per_serving
                    ? `${Math.round(nutrition.fiber_g)}g per serving`
                    : `${Math.round(nutrition.fiber_g)}g total`}
                </Text>
              </View>
            )}
            {nutrition.sugar_g && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sugar</Text>
                <Text style={styles.detailValue}>
                  {nutrition.calories_per_serving
                    ? `${Math.round(nutrition.sugar_g)}g per serving`
                    : `${Math.round(nutrition.sugar_g)}g total`}
                </Text>
              </View>
            )}
            {nutrition.sodium_mg && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sodium</Text>
                <Text style={styles.detailValue}>
                  {nutrition.calories_per_serving
                    ? `${Math.round(nutrition.sodium_mg)}mg per serving`
                    : `${Math.round(nutrition.sodium_mg)}mg total`}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.section,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.body,
    fontWeight: "600",
    color: colors.primary,
  },
  macrosContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  macrosTitle: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  macroLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  macroValue: {
    ...typography.body,
    fontWeight: "600",
  },
  detailsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailsTitle: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    fontWeight: "600",
  },
  unavailableText: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
