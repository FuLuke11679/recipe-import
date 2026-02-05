import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, ChipToggle, TextInputField, SecondaryButton, ScreenHeader } from "../components";
import { colors, spacing, typography } from "../theme";
import { useOnboardingStore } from "../state/onboardingStore";
import { useAuthStore } from "../state/authStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

const DIET_OPTIONS = ["None", "Vegetarian", "Vegan", "Gluten-Free", "Keto / Low-Carb"];
const ALLERGY_OPTIONS = ["Nuts", "Dairy", "Shellfish", "Eggs"];
const TIME_OPTIONS = [15, 30, 45];
const CONFIDENCE_OPTIONS = ["Beginner", "Comfortable", "Confident"];
const GOAL_OPTIONS = ["Eating lighter", "Less decision stress", "Cooking more at home", "Staying consistent"];

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const {
    diet,
    allergies,
    customAllergies,
    maxTime,
    cookingConfidence,
    goals,
    setDiet,
    addAllergy,
    removeAllergy,
    addCustomAllergy,
    removeCustomAllergy,
    setMaxTime,
    setCookingConfidence,
    addGoal,
    removeGoal,
  } = useOnboardingStore();
  const { user, clearAuth } = useAuthStore();
  const [showCustomAllergyInput, setShowCustomAllergyInput] = useState(false);
  const [customAllergyInput, setCustomAllergyInput] = useState("");

  const handleAddCustomAllergy = () => {
    if (customAllergyInput.trim()) {
      addCustomAllergy(customAllergyInput.trim());
      setCustomAllergyInput("");
      setShowCustomAllergyInput(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          clearAuth();
          navigation.replace("Login");
        },
      },
    ]);
  };

  const allAllergies = [...allergies, ...customAllergies];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{user?.username || "N/A"}</Text>
          </View>
          {user?.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diet Preferences</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
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
          {showCustomAllergyInput ? (
            <View style={styles.customInputContainer}>
              <TextInputField
                placeholder="Enter allergy"
                value={customAllergyInput}
                onChangeText={setCustomAllergyInput}
                autoFocus
              />
              <View style={styles.customInputButtons}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => {
                    setShowCustomAllergyInput(false);
                    setCustomAllergyInput("");
                  }}
                />
                <PrimaryButton title="Add" onPress={handleAddCustomAllergy} />
              </View>
            </View>
          ) : (
            <View style={styles.addCustomButton}>
              <SecondaryButton title="+ Add custom allergy" onPress={() => setShowCustomAllergyInput(true)} />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cooking Preferences</Text>
          <Text style={styles.subsectionTitle}>Maximum cooking time</Text>
          <View style={styles.timeContainer}>
            {TIME_OPTIONS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[styles.timeOption, maxTime === time && styles.timeOptionSelected]}
                onPress={() => setMaxTime(maxTime === time ? null : time)}
              >
                <Text style={[styles.timeText, maxTime === time && styles.timeTextSelected]}>{time} min</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.subsectionTitle}>Cooking confidence</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals</Text>
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
        </View>

        <View style={styles.section}>
          <SecondaryButton title="Logout" onPress={handleLogout} />
        </View>
      </ScrollView>
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
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.section,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    ...typography.body,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    fontWeight: "600",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  timeContainer: {
    flexDirection: "row",
    marginBottom: spacing.md,
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
  customInputContainer: {
    marginTop: spacing.md,
  },
  customInputButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addCustomButton: {
    marginTop: spacing.md,
  },
});
