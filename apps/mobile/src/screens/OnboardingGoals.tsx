import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, SecondaryButton, ChipToggle } from "../components";
import { colors, spacing, typography } from "../theme";
import { useOnboardingStore, setUserOnboardingCompleted } from "../state/onboardingStore";
import { useAuthStore } from "../state/authStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingGoals">;

const GOAL_OPTIONS = [
  "Eating lighter",
  "Less decision stress",
  "Cooking more at home",
  "Staying consistent",
];

export const OnboardingGoalsScreen: React.FC<Props> = ({ navigation }) => {
  const { goals, addGoal, removeGoal, setCompleted } = useOnboardingStore();
  const { user } = useAuthStore();

  const handleFinish = async () => {
    setCompleted(true);
    if (user?.id) {
      await setUserOnboardingCompleted(user.id, true);
    }
    navigation.replace("MainTabs");
  };

  const handleSkip = async () => {
    setCompleted(true);
    if (user?.id) {
      await setUserOnboardingCompleted(user.id, true);
    }
    navigation.replace("MainTabs");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>What do you want help with?</Text>
        <View style={styles.chipsContainer}>
          {GOAL_OPTIONS.map((option) => (
            <ChipToggle
              key={option}
              label={option}
              selected={goals.includes(option)}
              onPress={() => {
                if (goals.includes(option)) {
                  removeGoal(option);
                } else {
                  addGoal(option);
                }
              }}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <View style={styles.skipButton}>
          <SecondaryButton title="Skip" onPress={handleSkip} />
        </View>
        <PrimaryButton title="Finish" onPress={handleFinish} />
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
  skipButton: {
    marginBottom: spacing.sm,
  },
});
