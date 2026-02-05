import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { PrimaryButton, LoadingState, ErrorState } from "../components";
import { colors, spacing, typography } from "../theme";
import { getImport } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AdaptSummary">;

export const AdaptSummaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;

  const { data: job, isLoading, error } = useQuery({
    queryKey: ["import", importId],
    queryFn: () => getImport(importId),
  });

  if (isLoading) {
    return <LoadingState message="Loading..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error?.message || "Failed to load summary"}
        onRetry={() => {}}
      />
    );
  }

  const changeSummary = job?.change_summary || "No changes summary available.";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Updated for you:</Text>
        <View style={styles.summaryContainer}>
          {changeSummary.split("\n").map((line, idx) => (
            line.trim() && (
              <Text key={idx} style={styles.bullet}>
                • {line.trim()}
              </Text>
            )
          ))}
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Back to recipe"
          onPress={() => navigation.navigate("RecipeView", { importId })}
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
    marginBottom: spacing.lg,
  },
  summaryContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bullet: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default AdaptSummaryScreen;
