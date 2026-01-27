import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, ChipToggle, TextInputField, SectionHeader, LoadingState, Stepper } from "../components";
import { colors, spacing, typography } from "../theme";
import { adaptRecipe } from "../api/client";
import { useOnboardingStore } from "../state/onboardingStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Adapt">;

const DIET_OPTIONS = ["None", "Vegetarian", "Vegan", "Gluten-Free", "Keto / Low-Carb"];
const TIME_OPTIONS = [15, 30, 45];

export const AdaptScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const { diet: savedDiet, maxTime: savedMaxTime } = useOnboardingStore();
  const queryClient = useQueryClient();
  const [diet, setDiet] = useState<string | null>(savedDiet || "None");
  const [maxTime, setMaxTime] = useState<number | null>(savedMaxTime);
  const [servings, setServings] = useState<number>(4); // Default to 4 servings
  const [allergies, setAllergies] = useState<string>("");

  const adaptMutation = useMutation({
    mutationFn: (constraints: any) => adaptRecipe(importId, constraints),
    onSuccess: (data) => {
      // Verify the recipe was saved by checking it has adapted_recipe
      if (!data.adapted_recipe && !data.parsed_recipe) {
        Alert.alert("Error", "Recipe adaptation failed. Please try again.");
        return;
      }
      
      // Update the import query cache
      queryClient.setQueryData(["import", importId], data);
      // Invalidate recipes list to refresh both Home and Recipes tab
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Refetch grocery list immediately since it's generated from the recipe
      queryClient.refetchQueries({ queryKey: ["groceryList", importId] });
      
      const recipe = data.adapted_recipe || data.parsed_recipe;
      const recipeTitle = recipe?.title || "Recipe";
      
      // Show success message with verification
      Alert.alert(
        "Recipe Adapted ✓",
        `${recipeTitle} has been adapted and saved to your recipe list.`,
        [
          {
            text: "View Recipe",
            onPress: () => {
              navigation.goBack();
            },
          },
          {
            text: "View All Recipes",
            onPress: () => {
              // Navigate directly to Recipes tab, resetting the navigation stack
              try {
                // Get the root navigator
                const rootNavigator = navigation.getParent()?.getParent();
                if (rootNavigator) {
                  // Reset navigation to MainTabs with Recipes screen
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
                  // Fallback: navigate normally
                  navigation.getParent()?.navigate("MainTabs", {
                    screen: "Recipes",
                  });
                  navigation.goBack();
                }
              } catch (e) {
                console.log("Navigation error:", e);
                // Fallback: just go back
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
    const constraints = {
      diet: diet?.toLowerCase().replace(" / ", "-").replace(" ", "-") || "none",
      max_time: maxTime,
      servings: servings || null,
      allergies: allergies || null,
    };
    adaptMutation.mutate(constraints);
  };

  if (adaptMutation.isPending) {
    return <LoadingState message="Adapting recipe..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Diet" />
        <View style={styles.chipsContainer}>
          {DIET_OPTIONS.map((option) => (
            <ChipToggle
              key={option}
              label={option}
              selected={diet === option}
              onPress={() => setDiet(diet === option ? null : option)}
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
              onPress={() => setMaxTime(maxTime === time ? null : time)}
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
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default AdaptScreen;
