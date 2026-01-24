import React from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton, RecipeIngredientsList, RecipeStepsList, LoadingState, ErrorState } from "../components";
import { colors, spacing, typography } from "../theme";
import { extractRecipe, getImport } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeView">;

export const RecipeViewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const queryClient = useQueryClient();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ["import", importId],
    queryFn: () => getImport(importId),
    refetchInterval: (data) => {
      const status = data?.status;
      if (status === "EXTRACTING" || status === "ADAPTING") {
        return 2000;
      }
      return false;
    },
  });

  const extractMutation = useMutation({
    mutationFn: () => extractRecipe(importId),
    onSuccess: (data) => {
      queryClient.setQueryData(["import", importId], data);
      // Invalidate recipes list so it refreshes on home screen and recipes tab
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Show success message
      Alert.alert("Recipe Extracted", "Your recipe has been extracted and saved!", [
        { text: "OK" },
      ]);
    },
  });

  const saveRecipeMutation = useMutation({
    mutationFn: async () => {
      // Recipe is already saved when extracted/adapted, just refresh the list
      // This mutation is just for UI feedback
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for better UX
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate recipes list to refresh both Home and Recipes tab
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Also refetch the current import to ensure it's up to date
      queryClient.invalidateQueries({ queryKey: ["import", importId] });
      
      // Show success message with navigation options
      Alert.alert(
        "Recipe Saved",
        "Your recipe has been saved and will appear in your recipe list.",
        [
          {
            text: "View Recipes",
            onPress: () => {
              // Navigate to MainTabs and switch to Recipes tab
              try {
                // Get the root navigator (AppNavigator)
                const rootNavigator = navigation.getParent()?.getParent();
                if (rootNavigator) {
                  // Navigate to MainTabs with Recipes tab selected
                  rootNavigator.navigate("MainTabs", {
                    screen: "Recipes",
                  });
                } else {
                  // Fallback: navigate directly to MainTabs
                  navigation.navigate("MainTabs", {
                    screen: "Recipes",
                  });
                }
              } catch (e) {
                // Fallback: just navigate to MainTabs
                console.log("Navigation error:", e);
                navigation.navigate("MainTabs");
              }
            },
          },
          {
            text: "OK",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to save recipe. Please try again.");
      console.error("Save recipe error:", error);
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading recipe..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error?.message || "Failed to load recipe"}
        onRetry={() => {}}
      />
    );
  }

  const metadata = job?.metadata as Record<string, any> | null;
  const caption = metadata?.caption || metadata?.description || "";
  const transcript = metadata?.transcript || "";

  const recipe = job?.adapted_recipe || job?.parsed_recipe;
  if (!recipe) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Recipe not extracted yet</Text>
          <Text style={styles.subtitle}>We’ve pulled the TikTok details below. Extract the recipe when you’re ready.</Text>

          {caption ? (
            <View style={styles.textBlock}>
              <Text style={styles.blockTitle}>Caption</Text>
              <Text style={styles.blockBody}>{caption}</Text>
            </View>
          ) : null}

          {transcript ? (
            <View style={styles.textBlock}>
              <Text style={styles.blockTitle}>Transcript</Text>
              <Text style={styles.blockBody}>{transcript}</Text>
            </View>
          ) : null}

          {job?.raw_recipe_text && !caption && (
            <View style={styles.textBlock}>
              <Text style={styles.blockTitle}>Recipe text</Text>
              <Text style={styles.blockBody}>{job.raw_recipe_text}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <View style={styles.adaptButton}>
            <SecondaryButton title="Back" onPress={() => navigation.goBack()} />
          </View>
          <PrimaryButton
            title={extractMutation.isPending ? "Extracting..." : "Extract recipe"}
            onPress={() => extractMutation.mutate()}
            loading={extractMutation.isPending}
          />
        </View>
      </View>
    );
  }

  const changeSummary = job?.change_summary || null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.subtitle}>Adapted for you</Text>

        {caption ? (
          <View style={styles.textBlock}>
            <Text style={styles.blockTitle}>Caption</Text>
            <Text style={styles.blockBody}>{caption}</Text>
          </View>
        ) : null}

        {transcript ? (
          <View style={styles.textBlock}>
            <Text style={styles.blockTitle}>Transcript</Text>
            <Text style={styles.blockBody}>{transcript}</Text>
          </View>
        ) : null}
        
        {changeSummary && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Why this works:</Text>
            {changeSummary.split("\n").map((line, idx) => (
              line.trim() && (
                <Text key={idx} style={styles.summaryBullet}>
                  • {line.trim()}
                </Text>
              )
            ))}
          </View>
        )}

        <RecipeIngredientsList ingredients={recipe.ingredients || []} />
        <RecipeStepsList steps={recipe.steps || []} />
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <View style={styles.topButtons}>
          <View style={styles.adaptButton}>
            <SecondaryButton
              title="Adapt"
              onPress={() => navigation.navigate("Adapt", { importId })}
            />
          </View>
          <View style={styles.saveButton}>
            <PrimaryButton
              title={saveRecipeMutation.isPending ? "Saving..." : "Save Recipe"}
              onPress={() => saveRecipeMutation.mutate()}
              loading={saveRecipeMutation.isPending}
            />
          </View>
        </View>
        <PrimaryButton
          title="Grocery List"
          onPress={() => navigation.navigate("GroceryList", { importId })}
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
  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.secondary,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  summaryContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    ...typography.section,
    marginBottom: spacing.sm,
  },
  summaryBullet: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  topButtons: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  adaptButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  textBlock: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blockTitle: {
    ...typography.section,
    marginBottom: spacing.xs,
  },
  blockBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
});

export default RecipeViewScreen;
