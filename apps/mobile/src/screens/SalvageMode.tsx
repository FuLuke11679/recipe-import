import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton, LoadingState, EmptyState } from "../components";
import { colors, spacing, typography } from "../theme";
import { useAnonId } from "../hooks/useAnonId";
import { listRecipes } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "SalvageMode">;

// Helper to find easy recipes (simple criteria: fewer ingredients, shorter time)
const findEasyRecipe = (recipes: any[]) => {
  return recipes
    .filter((r) => {
      const recipe = r.adapted_recipe || r.parsed_recipe;
      if (!recipe) return false;
      const ingredientCount = recipe.ingredients?.length || 0;
      const stepCount = recipe.steps?.length || 0;
      // Easy recipe: <= 5 ingredients and <= 5 steps
      return ingredientCount <= 5 && stepCount <= 5;
    })
    .sort((a, b) => {
      const aRecipe = a.adapted_recipe || a.parsed_recipe;
      const bRecipe = b.adapted_recipe || b.parsed_recipe;
      const aCount = (aRecipe?.ingredients?.length || 0) + (aRecipe?.steps?.length || 0);
      const bCount = (bRecipe?.ingredients?.length || 0) + (bRecipe?.steps?.length || 0);
      return aCount - bCount;
    })[0];
};

export const SalvageModeScreen: React.FC<Props> = ({ navigation }) => {
  const userId = useAnonId();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["recipes", userId],
    queryFn: () => listRecipes(userId || ""),
    enabled: !!userId,
  });

  const handleResetWeek = () => {
    // Clear any saved meal plans (for now, just navigate to recipes with easy filter)
    // In a full implementation, this would clear meal planning state
    try {
      const rootNavigator = navigation.getParent()?.getParent();
      if (rootNavigator) {
        rootNavigator.navigate("MainTabs", { screen: "Recipes" });
      } else {
        navigation.navigate("MainTabs", { screen: "Recipes" });
      }
    } catch (e) {
      navigation.navigate("MainTabs");
    }
  };

  const handleOneEasyMeal = () => {
    if (isLoading || !recipes || recipes.length === 0) {
      // No recipes available, go to import
      navigation.navigate("MainTabs", { screen: "Home" });
      return;
    }

    const easyRecipe = findEasyRecipe(recipes);
    if (easyRecipe) {
      navigation.navigate("RecipeView", { importId: easyRecipe.id });
    } else {
      // No easy recipes found, show message and go to recipes
      navigation.navigate("MainTabs", { screen: "Recipes" });
    }
  };

  if (isLoading) {
    return <LoadingState message="Finding easy meals..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Looks like this week got busy.</Text>
        <Text style={styles.body}>
          Want a reset plan using what you already have?
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Reset week"
          onPress={handleResetWeek}
        />
        <View style={styles.secondaryButton}>
          <SecondaryButton
            title="One easy meal"
            onPress={handleOneEasyMeal}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    alignItems: "center",
  },
  title: {
    ...typography.title,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    textAlign: "center",
    color: colors.textSecondary,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});

export default SalvageModeScreen;
