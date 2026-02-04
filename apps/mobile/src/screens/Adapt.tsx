import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, ChipToggle, TextInputField, SectionHeader, LoadingState, Stepper, ScreenHeader } from "../components";
import { colors, spacing, typography } from "../theme";
import { adaptRecipe, getImport } from "../api/client";
import { useOnboardingStore } from "../state/onboardingStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Adapt">;

const DIET_OPTIONS = ["None", "Vegetarian", "Vegan", "Gluten-Free", "Keto / Low-Carb"];
const TIME_OPTIONS = [15, 30, 45];

export const AdaptScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const { 
    diet: savedDiet, 
    maxTime: savedMaxTime, 
    allergies: savedAllergies,
    customAllergies: savedCustomAllergies,
    setDiet,
    setMaxTime,
  } = useOnboardingStore();
  const queryClient = useQueryClient();
  
  // Fetch the original recipe to include it
  const { data: originalJob } = useQuery({
    queryKey: ["import", importId],
    queryFn: () => getImport(importId),
  });

  const [diet, setDietLocal] = useState<string | null>(savedDiet || "None");
  const [maxTime, setMaxTimeLocal] = useState<number | null>(savedMaxTime);
  const [servings, setServings] = useState<number>(4); // Default to 4 servings
  const [allergies, setAllergies] = useState<string>(
    [...savedAllergies, ...savedCustomAllergies].join(", ")
  );
  const [maxCalories, setMaxCalories] = useState<string>("");
  const [minProtein, setMinProtein] = useState<string>("");

  const adaptMutation = useMutation({
    mutationFn: ({ constraints, createNew }: { constraints: any; createNew: boolean }) => 
      adaptRecipe(importId, constraints, createNew),
    onSuccess: (data, variables) => {
      // Verify the recipe was saved by checking it has adapted_recipe
      if (!data.adapted_recipe && !data.parsed_recipe) {
        Alert.alert("Error", "Recipe adaptation failed. Please try again.");
        return;
      }
      
      // Save settings to onboarding store
      if (diet) setDiet(diet);
      if (maxTime !== null) setMaxTime(maxTime);
      
      // Update the import query cache
      queryClient.setQueryData(["import", importId], data);
      // If creating new recipe, also update the new recipe's cache
      if (variables.createNew && data.id !== importId) {
        queryClient.setQueryData(["import", data.id], data);
      }
      // Invalidate recipes list to refresh both Home and Recipes tab
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Refetch grocery list immediately since it's generated from the recipe
      const recipeId = variables.createNew ? data.id : importId;
      queryClient.refetchQueries({ queryKey: ["groceryList", recipeId] });
      
      const recipe = data.adapted_recipe || data.parsed_recipe;
      const recipeTitle = recipe?.title || "Recipe";
      
      // Show success message
      Alert.alert(
        "Recipe Adapted ✓",
        `${recipeTitle} has been ${variables.createNew ? "created as a new recipe" : "updated"} and saved to your recipe list.`,
        [
          {
            text: "View Recipe",
            onPress: () => {
              if (variables.createNew && data.id !== importId) {
                navigation.replace("RecipeView", { importId: data.id });
              } else {
                navigation.goBack();
              }
            },
          },
          {
            text: "View All Recipes",
            onPress: () => {
              // Navigate directly to Recipes tab, resetting the navigation stack
              try {
                const rootNavigator = navigation.getParent()?.getParent();
                if (rootNavigator) {
                  rootNavigator.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: "MainTabs",
                          state: {
                            routes: [{ name: "Recipes" }],
                            index: 0,
                          },
                        },
                      ],
                    })
                  );
                } else {
                  navigation.getParent()?.navigate("MainTabs", {
                    screen: "Recipes",
                  });
                  navigation.goBack();
                }
              } catch (e) {
                console.log("Navigation error:", e);
                navigation.goBack();
              }
            },
          },
        ]
      );
    },
    onError: (error) => {
      Alert.alert(
        "Adaptation Failed",
        error?.message || "Failed to adapt recipe. Please try again.",
        [{ text: "OK" }]
      );
    },
  });

  const handleApply = () => {
    // Ask user if they want to create a new recipe or replace the current one
    Alert.alert(
      "Save Adapted Recipe",
      "Would you like to create a new recipe or replace the current one?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Create New Recipe",
          onPress: () => {
            const constraints = {
              diet: diet?.toLowerCase().replace(" / ", "-").replace(" ", "-") || "none",
              max_time: maxTime,
              servings: servings || null,
              allergies: allergies || null,
              max_calories_per_serving: maxCalories ? parseInt(maxCalories, 10) : null,
              min_protein_g: minProtein ? parseFloat(minProtein) : null,
            };
            adaptMutation.mutate({ constraints, createNew: true });
          },
        },
        {
          text: "Replace Current",
          style: "destructive",
          onPress: () => {
            const constraints = {
              diet: diet?.toLowerCase().replace(" / ", "-").replace(" ", "-") || "none",
              max_time: maxTime,
              servings: servings || null,
              allergies: allergies || null,
              max_calories_per_serving: maxCalories ? parseInt(maxCalories, 10) : null,
              min_protein_g: minProtein ? parseFloat(minProtein) : null,
            };
            adaptMutation.mutate({ constraints, createNew: false });
          },
        },
      ]
    );
  };

  if (adaptMutation.isPending) {
    return <LoadingState message="Adapting recipe..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Adapt Recipe" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Diet" />
        <View style={styles.chipsContainer}>
          {DIET_OPTIONS.map((option) => (
            <ChipToggle
              key={option}
              label={option}
              selected={diet === option}
              onPress={() => setDietLocal(diet === option ? null : option)}
            />
          ))}
        </View>

        <SectionHeader title="Max time" />
        <View style={styles.chipsContainer}>
          {TIME_OPTIONS.map((time) => (
            <ChipToggle
              key={time}
              label={`${time} min`}
              selected={maxTime === time}
              onPress={() => setMaxTimeLocal(maxTime === time ? null : time)}
            />
          ))}
        </View>

        <SectionHeader title="Servings" />
        <View style={styles.stepperContainer}>
          <Stepper
            value={servings}
            onIncrement={() => setServings(Math.min(servings + 1, 20))}
            onDecrement={() => setServings(Math.max(servings - 1, 1))}
            min={1}
            max={20}
          />
        </View>

        <SectionHeader title="Allergies" />
        <TextInputField
          placeholder="Enter allergies (comma-separated)"
          value={allergies}
          onChangeText={setAllergies}
        />

        <SectionHeader title="Nutrition Goals" />
        <TextInputField
          label="Max calories per serving"
          placeholder="e.g., 500"
          value={maxCalories}
          onChangeText={setMaxCalories}
          keyboardType="numeric"
        />
        <TextInputField
          label="Min protein per serving (g)"
          placeholder="e.g., 20"
          value={minProtein}
          onChangeText={setMinProtein}
          keyboardType="numeric"
        />
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Apply changes"
          onPress={handleApply}
          loading={adaptMutation.isPending}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.lg,
  },
  stepperContainer: {
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default AdaptScreen;
