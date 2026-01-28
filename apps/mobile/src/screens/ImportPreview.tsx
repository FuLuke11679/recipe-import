import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, LoadingState, ErrorState } from "../components";
import { colors, spacing, typography } from "../theme";
import { createImport, getImport } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ImportPreview">;

export const ImportPreviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { url, importId: initialImportId } = route.params;
  const queryClient = useQueryClient();
  const [currentImportId, setCurrentImportId] = useState<string | null>(initialImportId || null);

  // Create import if we have URL but no importId
  const createMutation = useMutation({
    mutationFn: ({ url }: { url: string }) => createImport({ url }),
    onSuccess: (data) => {
      setCurrentImportId(data.id);
      queryClient.invalidateQueries({ queryKey: ["import", data.id] });
    },
  });

  // Fetch import details
  const { data: job, isLoading, error } = useQuery({
    queryKey: ["import", currentImportId],
    queryFn: () => getImport(currentImportId!),
    enabled: !!currentImportId,
    refetchInterval: (data) => {
      // Poll while processing
      const status = data?.status;
      if (status === "CREATED" || status === "FETCHING_METADATA" || status === "EXTRACTING" || status === "ADAPTING") {
        return 2000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (url && !currentImportId) {
      createMutation.mutate({ url });
    }
  }, [url, currentImportId]);

  const handleImport = () => {
    if (url && !currentImportId) {
      createMutation.mutate({ url });
    }
  };

  if (isLoading || createMutation.isPending) {
    return <LoadingState message="Importing recipe..." />;
  }

  if (error || createMutation.isError) {
    const errorMessage = error?.message || createMutation.error?.message || "Failed to import recipe";
    console.error("ImportPreview error:", errorMessage, createMutation.error);
    return (
      <ErrorState
        message={errorMessage}
        onRetry={() => {
          if (url) {
            createMutation.mutate({ url });
          }
        }}
      />
    );
  }

  const metadata = job?.metadata as Record<string, any> | null;
  const creatorName = metadata?.author_name || metadata?.author || "Unknown Creator";
  const thumbnailUrl = metadata?.thumbnail_url || null;
  const isProcessing =
    job?.status === "CREATED" ||
    job?.status === "FETCHING_METADATA" ||
    job?.status === "EXTRACTING" ||
    job?.status === "ADAPTING";

  // Format status for display
  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailText}>No thumbnail available</Text>
        </View>
      )}
      
      {creatorName && creatorName !== "Unknown Creator" && (
        <Text style={styles.creatorName}>@{creatorName}</Text>
      )}
      
      {job?.status && (
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{formatStatus(job.status)}</Text>
        </View>
      )}
      
      <Text style={styles.body}>
        {isProcessing
          ? "Processing your recipe import..."
          : job?.status === "AWAITING_RECIPE_TEXT"
          ? "Ready to extract the recipe. Review the content below or paste your own recipe text."
          : "We'll turn this into a recipe you can actually cook."}
      </Text>
      
      {job?.status === "AWAITING_RECIPE_TEXT" && job?.raw_recipe_text && (
        <View style={styles.recipeTextPreview}>
          <Text style={styles.recipeTextLabel}>Recipe Text:</Text>
          <Text style={styles.recipeText} numberOfLines={5}>
            {job.raw_recipe_text}
          </Text>
        </View>
      )}
      <View style={styles.buttonWrapper}>
        {job && (job.adapted_recipe || job.parsed_recipe) ? (
          <PrimaryButton
            title="View recipe"
            onPress={() => navigation.navigate("RecipeView", { importId: job.id })}
          />
        ) : job?.status === "AWAITING_RECIPE_TEXT" ? (
          job.raw_recipe_text ? (
            <PrimaryButton
              title="Review & extract"
              onPress={() => navigation.navigate("RecipeView", { importId: job.id })}
            />
          ) : (
            <PrimaryButton
              title="Paste recipe"
              onPress={() => navigation.navigate("PasteRecipe", { importId: job.id })}
            />
          )
        ) : (
          <PrimaryButton
            title={isProcessing ? "Importing..." : "Import recipe"}
            onPress={handleImport}
            loading={createMutation.isPending || isProcessing}
            disabled={isProcessing}
          />
        )}
      </View>
      {job?.url && (
        <Text style={styles.urlText}>{job.url}</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  content: {
    padding: spacing.lg,
  },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    marginBottom: spacing.md,
    backgroundColor: colors.border,
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: colors.border,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  thumbnailText: {
    ...typography.secondary,
    color: colors.textSecondary,
  },
  creatorName: {
    ...typography.body,
    fontWeight: "600",
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  statusText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  body: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
  recipeTextPreview: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeTextLabel: {
    ...typography.section,
    marginBottom: spacing.xs,
  },
  recipeText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  buttonWrapper: {
    marginTop: spacing.lg,
  },
  urlText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default ImportPreviewScreen;
