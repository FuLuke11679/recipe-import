import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, LoadingState, ErrorState, PrimaryButton, SecondaryButton, StarRating } from "../components";
import { colors, spacing, typography } from "../theme";
import { deleteRecipe, listRecipes } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { TabParamList } from "../navigation/TabNavigator";
import { ImportJob } from "../../../packages/shared/types";

type RecipesListNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Recipes">,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: RecipesListNavigationProp;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
};

export const RecipesListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  type SortMode = "newest" | "oldest" | "title";
  const [sortMode, setSortMode] = React.useState<SortMode>("newest");
  const [pendingDeleteJob, setPendingDeleteJob] = React.useState<ImportJob | null>(null);
  const queryClient = useQueryClient();
  const { data: recipes, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      console.log("RecipesList: Fetching recipes");
      const result = await listRecipes();
      console.log("RecipesList: Received recipes:", result?.length || 0, "items");
      if (result && result.length > 0) {
        console.log("RecipesList: First recipe:", {
          id: result[0].id,
          user_id: result[0].user_id,
          has_parsed: !!result[0].parsed_recipe,
          has_adapted: !!result[0].adapted_recipe,
        });
      }
      return result;
    },
    staleTime: 0, // Always consider data stale to allow refetching
    refetchOnWindowFocus: true, // Refetch when screen comes into focus
    retry: 2, // Retry failed requests
  });

  useFocusEffect(
    React.useCallback(() => {
      console.log("RecipesList: Screen focused, refetching recipes");
      refetch();
    }, [refetch])
  );

  // Debug logging
  React.useEffect(() => {
    console.log("RecipesList: State update", {
      isLoading,
      isFetching,
      error: error?.message,
      recipesCount: recipes?.length || 0,
    });
  }, [isLoading, isFetching, error, recipes]);

  if (isLoading) {
    return <LoadingState message="Loading recipes..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>My Recipes</Text>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate("Profile")}
            >
              <Ionicons name="cog" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        <ErrorState
          message={error?.message || "Failed to load recipes"}
          onRetry={() => {
            console.log("RecipesList: Retrying fetch");
            refetch();
          }}
        />
      </View>
    );
  }

  // The /recipes endpoint already filters by parsed_recipe, so all returned recipes should have content
  // But we still filter to be safe and handle adapted recipes
  const recipesWithContent = (recipes || []).filter(
    (recipe) => {
      const hasRecipe = recipe.adapted_recipe || recipe.parsed_recipe;
      if (!hasRecipe) {
        console.log("RecipesList: Filtering out recipe without content:", recipe.id);
      }
      return hasRecipe;
    }
  );

  console.log("RecipesList: Rendering with", recipesWithContent.length, "recipes with content");

  const sortedRecipes = React.useMemo(() => {
    const items = [...recipesWithContent];
    if (sortMode === "title") {
      return items.sort((a, b) => {
        const aTitle = (a.adapted_recipe || a.parsed_recipe)?.title?.toLowerCase() || "";
        const bTitle = (b.adapted_recipe || b.parsed_recipe)?.title?.toLowerCase() || "";
        return aTitle.localeCompare(bTitle);
      });
    }
    if (sortMode === "oldest") {
      return items.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    // default: newest first
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [recipesWithContent, sortMode]);

  const deleteMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      console.log("RecipesList: Deleting recipe", recipeId);
      await deleteRecipe(recipeId);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["recipes"] });
      setPendingDeleteJob(null);
    },
    onError: (err: any) => {
      Alert.alert("Delete failed", err?.message || "Could not delete recipe.");
    },
  });

  const confirmDelete = (job: ImportJob) => {
    const recipe = job.adapted_recipe || job.parsed_recipe;
    const title = recipe?.title || "Untitled Recipe";
    console.log("RecipesList: Confirm delete pressed for", job.id, "title:", title);
    setPendingDeleteJob(job);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>My Recipes</Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="cog-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerRow}>
          <View style={styles.sortPills}>
            <TouchableOpacity
              style={[styles.sortPill, sortMode === "newest" && styles.sortPillActive]}
              onPress={() => setSortMode("newest")}
            >
              <Text
                style={[
                  styles.sortPillText,
                  sortMode === "newest" && styles.sortPillTextActive,
                ]}
              >
                Newest
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPill, sortMode === "oldest" && styles.sortPillActive]}
              onPress={() => setSortMode("oldest")}
            >
              <Text
                style={[
                  styles.sortPillText,
                  sortMode === "oldest" && styles.sortPillTextActive,
                ]}
              >
                Oldest
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPill, sortMode === "title" && styles.sortPillActive]}
              onPress={() => setSortMode("title")}
            >
              <Text
                style={[
                  styles.sortPillText,
                  sortMode === "title" && styles.sortPillTextActive,
                ]}
              >
                A–Z
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.newRecipeButton}>
            <SecondaryButton
              title="New recipe"
              onPress={() => navigation.navigate("PasteRecipe", { mode: "manual" })}
            />
          </View>
        </View>
        {isFetching && (
          <Text style={styles.refreshingText}>Refreshing...</Text>
        )}
      </View>
      {sortedRecipes.length > 0 ? (
        <FlatList
          data={sortedRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={() => {
            console.log("RecipesList: Pull to refresh triggered");
            refetch();
          }}
          renderItem={({ item }) => {
            const recipe = item.adapted_recipe || item.parsed_recipe;
            const title = recipe?.title || "Untitled Recipe";
            const rating = recipe?.rating || 0;
            return (
              <View style={styles.recipeItem}>
                <View style={styles.recipeTopRow}>
                  <TouchableOpacity
                    style={styles.recipeMain}
                    onPress={() => {
                      navigation.navigate("RecipeView", { importId: item.id });
                    }}
                    onLongPress={() => confirmDelete(item)}
                  >
                    <View style={styles.recipeHeader}>
                      <Text style={styles.recipeTitle}>{title}</Text>
                      {rating > 0 && (
                        <StarRating rating={rating} editable={false} size={16} />
                      )}
                    </View>
                    <Text style={styles.recipeDate}>{formatDate(item.created_at)}</Text>
                    {recipe?.ingredients && (
                      <Text style={styles.recipeIngredients}>
                        {recipe.ingredients.length} ingredient
                        {recipe.ingredients.length !== 1 ? "s" : ""}
                      </Text>
                    )}
                    {item.adapted_recipe && (
                      <View style={styles.adaptedBadge}>
                        <Text style={styles.adaptedBadgeText}>Adapted</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(item)}
                    disabled={deleteMutation.isPending}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState message="No recipes yet. Import your first recipe from TikTok!" />
          {recipes && recipes.length === 0 && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Debug Info:
              </Text>
              <Text style={styles.debugText}>
                Query returned: {recipes.length} recipes
              </Text>
              <Text style={styles.debugText}>
                {"\n"}Possible issues:
              </Text>
              <Text style={styles.debugText}>
                • Not logged in (check auth status)
              </Text>
              <Text style={styles.debugText}>
                • Recipes not extracted (need parsed_recipe)
              </Text>
              <Text style={styles.debugText}>
                • Check console for API errors
              </Text>
            </View>
          )}
        </View>
      )}
      {pendingDeleteJob && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete recipe?</Text>
            <Text style={styles.modalBody}>
              This will permanently delete "
              {(pendingDeleteJob.adapted_recipe || pendingDeleteJob.parsed_recipe)?.title ||
                "Untitled Recipe"}
              " from your saved recipes.
            </Text>
            <View style={styles.modalButtons}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setPendingDeleteJob(null)}
              />
              <PrimaryButton
                title={deleteMutation.isPending ? "Deleting..." : "Delete"}
                onPress={() => {
                  console.log("RecipesList: Deleting recipe from modal", pendingDeleteJob.id);
                  deleteMutation.mutate(pendingDeleteJob.id);
                }}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  header: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    ...typography.title,
  },
  profileButton: {
    padding: spacing.xs,
  },
  headerRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortPills: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  sortPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  sortPillActive: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary,
  },
  sortPillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sortPillTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  newRecipeButton: {
    marginLeft: spacing.sm,
  },
  refreshingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  debugInfo: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    margin: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: "monospace",
  },
  listContent: {
    padding: spacing.lg,
  },
  recipeItem: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  recipeTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  deleteConfirmGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  recipeMain: {
    flex: 1,
  },
  recipeTitle: {
    ...typography.body,
    fontWeight: "600",
    flex: 1,
  },
  cancelText: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingTop: 2,
  },
  deleteText: {
    ...typography.caption,
    color: "#EF4444",
    fontWeight: "600",
    paddingTop: 2,
  },
  recipeDate: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  recipeIngredients: {
    ...typography.caption,
    color: colors.primary,
  },
  adaptedBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  adaptedBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    fontSize: 10,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.section,
    marginBottom: spacing.sm,
  },
  modalBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});

export default RecipesListScreen;
