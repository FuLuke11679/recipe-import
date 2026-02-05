import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, ChipToggle } from "../components";
import { colors, spacing, typography } from "../theme";
import { useOnboardingStore } from "../state/onboardingStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingLifestyle">;

const TIME_OPTIONS = [15, 30, 45];
const CONFIDENCE_OPTIONS = ["Beginner", "Comfortable", "Confident"];

export const OnboardingLifestyleScreen: React.FC<Props> = ({ navigation }) => {
  const { maxTime, cookingConfidence, setMaxTime, setCookingConfidence } = useOnboardingStore();

  const handleContinue = () => {
    navigation.navigate("OnboardingGoals");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>How much time do you usually have?</Text>
        <View style={styles.timeContainer}>
          {TIME_OPTIONS.map((time) => (
            <TouchableOpacity
              key={time}
              style={[styles.timeOption, maxTime === time && styles.timeOptionSelected]}
              onPress={() => setMaxTime(maxTime === time ? null : time)}
            >
              <Text style={[styles.timeText, maxTime === time && styles.timeTextSelected]}>
                {time} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.subtitle}>Cooking confidence</Text>
        <View style={styles.chipsContainer}>
          {CONFIDENCE_OPTIONS.map((option) => (
            <ChipToggle
              key={option}
              label={option}
              selected={cookingConfidence === option}
              onPress={() => setCookingConfidence(cookingConfidence === option ? null : option)}
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
  timeContainer: {
    flexDirection: "row",
    marginBottom: spacing.xl,
  },
  timeOption: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  timeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeText: {
    ...typography.body,
    fontWeight: "600",
  },
  timeTextSelected: {
    color: colors.white,
  },
  subtitle: {
    ...typography.section,
    marginBottom: spacing.md,
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
