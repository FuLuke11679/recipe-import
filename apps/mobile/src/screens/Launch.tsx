import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components";
import { colors, spacing, typography } from "../theme";
import { useAnonId } from "../hooks/useAnonId";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Launch">;

export const LaunchScreen: React.FC<Props> = ({ navigation }) => {
  const userId = useAnonId();

  const handleContinue = () => {
    // Navigate to onboarding if not completed, otherwise to Home
    navigation.replace("OnboardingDiet");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo placeholder - replace with actual logo */}
        <View style={styles.logoPlaceholder} />
        <Text style={styles.appName}>Cooked</Text>
        <Text style={styles.title}>Turn saved recipes into meals you'll actually cook.</Text>
      </View>
      <View style={styles.buttonContainer}>
        <PrimaryButton title="Continue" onPress={handleContinue} disabled={!userId} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  appName: {
    ...typography.title,
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  title: {
    ...typography.body,
    fontSize: 18,
    textAlign: "center",
    maxWidth: 300,
    color: colors.textSecondary,
  },
  buttonContainer: {
    paddingBottom: spacing.xl,
  },
});
