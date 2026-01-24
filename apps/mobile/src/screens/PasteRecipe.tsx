import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { PrimaryButton, TextInputField, LoadingState, ErrorState } from "../components";
import { colors, spacing, typography } from "../theme";
import { submitRecipeText, extractRecipe } from "../api/client";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "PasteRecipe">;

export const PasteRecipeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const [text, setText] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (recipeText: string) => {
      await submitRecipeText(importId, recipeText);
      return await extractRecipe(importId);
    },
    onSuccess: () => {
      navigation.replace("RecipeView", { importId });
    },
  });

  const handleSubmit = () => {
    if (text.trim()) {
      submitMutation.mutate(text.trim());
    }
  };

  if (submitMutation.isPending) {
    return <LoadingState message="Extracting recipe..." />;
  }

  if (submitMutation.isError) {
    return (
      <ErrorState
        message={submitMutation.error?.message || "Failed to extract recipe"}
        onRetry={handleSubmit}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Couldn't find ingredients automatically.</Text>
      <Text style={styles.body}>Paste what you see or hear from the video.</Text>
      <TextInputField
        placeholder="Paste recipe text here..."
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={10}
        style={styles.textInput}
      />
      <PrimaryButton
        title="Continue"
        onPress={handleSubmit}
        disabled={!text.trim()}
        loading={submitMutation.isPending}
      />
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
  title: {
    ...typography.title,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
  textInput: {
    minHeight: 200,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
});

export default PasteRecipeScreen;
