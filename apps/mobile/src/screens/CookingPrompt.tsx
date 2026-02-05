import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, SecondaryButton } from "../components";
import { colors, spacing, typography } from "../theme";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "CookingPrompt">;

export const CookingPromptScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;

  const handleStartCooking = () => {
    // Navigate to recipe view or cooking mode
    navigation.navigate("RecipeView", { importId });
  };

  const handleSaveForLater = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Ready to cook?</Text>
      </View>
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Start cooking"
          onPress={handleStartCooking}
        />
        <View style={styles.secondaryButton}>
          <SecondaryButton
            title="Save for later"
            onPress={handleSaveForLater}
          />
        </View>
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
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  secondaryButton: {
    marginTop: spacing.sm,
  },
});

export default CookingPromptScreen;
