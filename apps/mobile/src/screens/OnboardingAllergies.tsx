import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, ChipToggle, TextInputField } from "../components";
import { colors, spacing, typography } from "../theme";
import { useOnboardingStore } from "../state/onboardingStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingAllergies">;

const ALLERGY_OPTIONS = ["Nuts", "Dairy", "Shellfish", "Eggs"];

export const OnboardingAllergiesScreen: React.FC<Props> = ({ navigation }) => {
  const { allergies, customAllergies, addAllergy, removeAllergy, addCustomAllergy, removeCustomAllergy } =
    useOnboardingStore();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const handleAddCustom = () => {
    if (customInput.trim()) {
      addCustomAllergy(customInput.trim());
      setCustomInput("");
      setShowCustomInput(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate("OnboardingLifestyle");
  };

  const allAllergies = [...allergies, ...customAllergies];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Any foods to avoid?</Text>
        <View style={styles.chipsContainer}>
          {ALLERGY_OPTIONS.map((option) => (
            <ChipToggle
              key={option}
              label={option}
              selected={allergies.includes(option)}
              onPress={() => {
                if (allergies.includes(option)) {
                  removeAllergy(option);
                } else {
                  addAllergy(option);
                }
              }}
            />
          ))}
          {customAllergies.map((allergy) => (
            <ChipToggle
              key={`custom-${allergy}`}
              label={allergy}
              selected={true}
              onPress={() => removeCustomAllergy(allergy)}
            />
          ))}
        </View>
        {showCustomInput ? (
          <View style={styles.customInputContainer}>
            <TextInputField
              placeholder="Enter allergy"
              value={customInput}
              onChangeText={setCustomInput}
              autoFocus
            />
            <PrimaryButton title="Add" onPress={handleAddCustom} />
          </View>
        ) : (
          <View style={styles.addCustomButton}>
            <PrimaryButton
              title="+ Add custom"
              onPress={() => setShowCustomInput(true)}
            />
          </View>
        )}
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
    marginBottom: spacing.md,
  },
  customInputContainer: {
    marginTop: spacing.md,
  },
  addCustomButton: {
    marginTop: spacing.md,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
