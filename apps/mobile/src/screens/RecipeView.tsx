import React from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, SecondaryButton, RecipeIngredientsList, RecipeStepsList, LoadingState, ErrorState, CollapsibleSection, ScreenHeader, NutritionInfo, StarRating } from "../components";
import { colors, spacing, typography } from "../theme";
import { extractRecipe, getImport, updateRecipeRating } from "../api/client";
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

  // Get recipe early so we can use it in hooks
  const recipe = job?.adapted_recipe || job?.parsed_recipe;
  
  // Rating state - initialize from recipe (must be before any conditional returns)
  const [currentRating, setCurrentRating] = React.useState<number>(
    recipe?.rating || 0
  );
  
  // Update rating when recipe changes
  React.useEffect(() => {
    if (recipe?.rating !== undefined && recipe.rating !== null) {
      setCurrentRating(recipe.rating);
    }
  }, [recipe?.rating]);
  
  const ratingMutation = useMutation({
    mutationFn: (rating: number) => updateRecipeRating(importId, rating),
    onSuccess: (data) => {
      queryClient.setQueryData(["import", importId], data);
      const updatedRecipe = data.adapted_recipe || data.parsed_recipe;
      if (updatedRecipe?.rating !== undefined && updatedRecipe.rating !== null) {
        setCurrentRating(updatedRecipe.rating);
      }
    },
  });
  
  const handleRatingChange = (rating: number) => {
    setCurrentRating(rating);
    ratingMutation.mutate(rating);
  };

  const extractMutation = useMutation({
    mutationFn: () => extractRecipe(importId),
    onSuccess: (data) => {
      queryClient.setQueryData(["import", importId], data);
      // Invalidate recipes list so it refreshes on home screen and recipes tab
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Refetch grocery list immediately since it's generated from the recipe
      queryClient.refetchQueries({ queryKey: ["groceryList", importId] });
      // Show success message
      Alert.alert("Recipe Extracted", "Your recipe has been extracted and saved!", [
        { text: "OK" },
      ]);
    },
  });

  const saveRecipeMutation = useMutation({
    mutationFn: async () => {
      // Fetch the latest recipe data from the database to verify it's saved
      const savedRecipe = await getImport(importId);
      
      // Check if recipe has been extracted/adapted (i.e., saved)
      if (!savedRecipe.parsed_recipe && !savedRecipe.adapted_recipe) {
        throw new Error("Recipe not yet extracted. Please extract the recipe first.");
      }
      
      // Recipe is already saved when extracted/adapted - just verify it exists
      // The /recipes endpoint returns all recipes with parsed_recipe for the authenticated user
      return savedRecipe;
    },
    onSuccess: async (savedRecipe) => {
      // Update the cache with verified data
      queryClient.setQueryData(["import", importId], savedRecipe);
      
      // Refetch recipes list immediately to show the saved recipe
      // Use refetchQueries to force immediate update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["recipes"] }),
        queryClient.refetchQueries({ queryKey: ["groceryList", importId] }),
      ]);
      
      const recipe = savedRecipe.adapted_recipe || savedRecipe.parsed_recipe;
      const recipeTitle = recipe?.title || "Recipe";
      
      // Show success message with navigation options
      Alert.alert(
        "Recipe Saved ✓",
        `${recipeTitle} has been saved and will appear in your recipe list.`,
        [
          {
            text: "View All Recipes",
            onPress: () => {
              // Navigate directly to Recipes tab
              try {
                // Get the parent navigator (should be MainTabs)
                const parentNavigator = navigation.getParent();
                
                // If we have a parent navigator, navigate to Recipes tab within it
                if (parentNavigator) {
                  parentNavigator.navigate("Recipes");
                }
                
                // Then go back to remove RecipeView from stack
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              } catch (e) {
                console.log("Navigation error:", e);
                // Fallback: just go back
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }
            },
          },
          {
            text: "Stay Here",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    },
    onError: (error) => {
      console.error("Save recipe error:", error);
      Alert.alert(
        "Save Failed",
        error?.message || "Failed to save recipe. Please try again.",
        [
          {
            text: "Retry",
            onPress: () => saveRecipeMutation.mutate(),
          },
          {
            text: "OK",
            style: "cancel",
          },
        ]
      );
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
  const onScreenText = metadata?.on_screen_text || "";
  const authorName = metadata?.author_name || null;
  
  // Debug logging
  if (recipe) {
    console.log("RecipeView: Recipe nutrition data:", JSON.stringify(recipe.nutrition, null, 2));
  }
  
  if (!recipe) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Recipe" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Recipe not extracted yet</Text>
          <Text style={styles.subtitle}>We’ve pulled the TikTok details below. Extract the recipe when you’re ready.</Text>

          {(caption || transcript || onScreenText || job?.raw_recipe_text) && (
            <CollapsibleSection title="Video Details" defaultCollapsed={true}>
              {caption && (
                <View style={styles.textBlock}>
                  <Text style={styles.blockTitle}>Caption</Text>
                  <Text style={styles.blockBody}>{caption}</Text>
                </View>
              )}
              {transcript && (
                <View style={styles.textBlock}>
                  <Text style={styles.blockTitle}>Transcript (Spoken Audio)</Text>
                  <Text style={styles.blockBody}>{transcript}</Text>
                </View>
              )}
              {onScreenText && (
                <View style={styles.textBlock}>
                  <Text style={styles.blockTitle}>On-Screen Text (Written on Video)</Text>
                  <Text style={styles.blockBody}>{onScreenText}</Text>
                </View>
              )}
              {job?.raw_recipe_text && !caption && (
                <View style={styles.textBlock}>
                  <Text style={styles.blockTitle}>Recipe text</Text>
                  <Text style={styles.blockBody}>{job.raw_recipe_text}</Text>
                </View>
              )}
            </CollapsibleSection>
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
      <ScreenHeader title="Recipe" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{recipe.title}</Text>
          <StarRating
            rating={Math.round(currentRating)}
            onRatingChange={handleRatingChange}
            editable={true}
            size={20}
          />
        </View>
        {job?.adapted_recipe && <Text style={styles.subtitle}>Adapted for you</Text>}
        
        {/* Creator */}
        {authorName && (
          <View style={styles.creatorInfo}>
            <Ionicons name="person-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.creatorText}>@{authorName}</Text>
          </View>
        )}
        
        {job?.url && (
          <TouchableOpacity
            style={styles.videoLink}
            onPress={() => {
              Linking.openURL(job.url).catch((err) => {
                console.error("Failed to open URL:", err);
                Alert.alert("Error", "Could not open video link");
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="play-circle" size={20} color={colors.primary} />
            <Text style={styles.videoLinkText}>Watch Original Video</Text>
            <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        
        <NutritionInfo nutrition={recipe.nutrition} servings={recipe.servings} />

        {(caption || transcript || onScreenText) && (
          <CollapsibleSection title="Video Details" defaultCollapsed={true}>
            {caption && (
              <View style={styles.textBlock}>
                <Text style={styles.blockTitle}>Caption</Text>
                <Text style={styles.blockBody}>{caption}</Text>
              </View>
            )}
            {transcript && (
              <View style={styles.textBlock}>
                <Text style={styles.blockTitle}>Transcript (Spoken Audio)</Text>
                <Text style={styles.blockBody}>{transcript}</Text>
              </View>
            )}
            {onScreenText && (
              <View style={styles.textBlock}>
                <Text style={styles.blockTitle}>On-Screen Text (Written on Video)</Text>
                <Text style={styles.blockBody}>{onScreenText}</Text>
              </View>
            )}
          </CollapsibleSection>
        )}
        
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
              disabled={saveRecipeMutation.isPending}
            />
          </View>
        </View>
        <View style={styles.middleButton}>
          <PrimaryButton
            title="Grocery List"
            onPress={() => navigation.navigate("GroceryList", { importId })}
          />
        </View>
        <View style={styles.backButton}>
          <SecondaryButton
            title="Back to Recipes"
            onPress={() => {
              try {
                // Get the parent navigator (should be MainTabs)
                const parentNavigator = navigation.getParent();
                
                // If we have a parent navigator, navigate to Recipes tab within it
                if (parentNavigator) {
                  parentNavigator.navigate("Recipes");
                }
                
                // Then go back to remove RecipeView from stack
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              } catch (e) {
                console.log("Navigation error:", e);
                // Fallback: just go back
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }
            }}
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
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    flex: 1,
  },
  subtitle: {
    ...typography.secondary,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  creatorText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  videoLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  videoLinkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: colors.backgroundSubtle,
    padding: spacing.md,
    borderRadius: 4,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
  middleButton: {
    marginTop: spacing.sm,
  },
  backButton: {
    marginTop: spacing.sm,
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
