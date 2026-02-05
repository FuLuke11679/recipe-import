import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, ChipToggle } from "../components";
import { colors, spacing, typography } from "../theme";
import { useOnboardingStore } from "../state/onboardingStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingDiet">;

const DIET_OPTIONS = ["None", "Vegetarian", "Vegan", "Gluten-Free", "Keto / Low-Carb"];

export const OnboardingDietScreen: React.FC<Props> = ({ navigation }) => {
  const { diet, setDiet } = useOnboardingStore();

  const handleContinue = () => {
    navigation.navigate("OnboardingAllergies");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>What kind of eating do you follow?</Text>
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
      </ScrollView>
      <View style={styles.buttonContainer}>
        <PrimaryButton title="Continue" onPress={handleContinue} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xl,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
