import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, ChipToggle } from "../components";
import { colors, spacing, typography } from "../theme";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "CompletionFeedback">;

const FEEDBACK_OPTIONS = ["Too hard", "Just right", "Too easy"];

export const CompletionFeedbackScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);

  const handleSubmit = () => {
    // Save feedback locally and send PostHog event (stub)
    // PostHog stub: if (posthog) posthog.capture('recipe_feedback', { importId, feedback: selectedFeedback });
    
    // Navigate to Recipes tab to see completed recipe
    try {
      const rootNavigator = navigation.getParent()?.getParent();
      if (rootNavigator) {
        rootNavigator.navigate("MainTabs", { screen: "Recipes" });
      } else {
        navigation.navigate("MainTabs", { screen: "Recipes" });
      }
    } catch (e) {
      console.log("Navigation error:", e);
      navigation.navigate("MainTabs");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Nice — you cooked it 🎉</Text>
        <Text style={styles.prompt}>How was it?</Text>
        <View style={styles.chipsContainer}>
          {FEEDBACK_OPTIONS.map((option) => (
            <ChipToggle
              key={option}
              label={option}
              selected={selectedFeedback === option}
              onPress={() => setSelectedFeedback(selectedFeedback === option ? null : option)}
            />
          ))}
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Submit"
          onPress={handleSubmit}
          disabled={!selectedFeedback}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    alignItems: "center",
  },
  title: {
    ...typography.title,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  prompt: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
});

export default CompletionFeedbackScreen;
