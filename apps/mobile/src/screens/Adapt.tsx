import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, ChipToggle, TextInputField, SectionHeader, LoadingState } from "../components";
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
  const [servings, setServings] = useState<string>("");
  const [allergies, setAllergies] = useState<string>("");

  const adaptMutation = useMutation({
    mutationFn: (constraints: any) => adaptRecipe(importId, constraints),
    onSuccess: (data) => {
      // Update the import query cache
      queryClient.setQueryData(["import", importId], data);
      // Invalidate recipes list to refresh both Home and Recipes tab
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      // Show success message
      Alert.alert("Recipe Adapted", "Your recipe has been adapted and saved!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
  });

  const handleApply = () => {
    const constraints = {
      diet: diet?.toLowerCase().replace(" / ", "-").replace(" ", "-") || "none",
      max_time: maxTime,
      servings: servings ? parseInt(servings, 10) : null,
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
        <TextInputField
          placeholder="Number of servings"
          value={servings}
          onChangeText={setServings}
          keyboardType="numeric"
        />

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
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default AdaptScreen;
