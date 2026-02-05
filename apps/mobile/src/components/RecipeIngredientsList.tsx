import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { spacing, typography, colors } from "../theme";
import { Ingredient } from "../../../packages/shared/types";

interface RecipeIngredientsListProps {
  ingredients: Ingredient[];
}

export const RecipeIngredientsList: React.FC<RecipeIngredientsListProps> = ({ ingredients }) => {
  const formatIngredient = (ing: Ingredient) => {
    const parts: string[] = [];
    if (ing.quantity) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    parts.push(ing.name);
    if (ing.notes) parts.push(`(${ing.notes})`);
    return parts.join(" ");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ingredients</Text>
      <FlatList
        data={ingredients}
        keyExtractor={(item, index) => `ingredient-${index}`}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.text}>{formatIngredient(item)}</Text>
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
  bullet: {
    ...typography.body,
    marginRight: spacing.sm,
  },
  text: {
    ...typography.body,
    flex: 1,
  },
});
