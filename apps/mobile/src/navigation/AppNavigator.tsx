import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { useOnboardingStore, getUserOnboardingCompleted } from "../state/onboardingStore";
import { useAuthStore } from "../state/authStore";
import { RootStackParamList } from "./types";
import { TabNavigator } from "./TabNavigator";
import { colors } from "../theme";

// Screens
import { LoginScreen } from "../screens/Login";
import { LaunchScreen } from "../screens/Launch";
import { OnboardingDietScreen } from "../screens/OnboardingDiet";
import { OnboardingAllergiesScreen } from "../screens/OnboardingAllergies";
import { OnboardingLifestyleScreen } from "../screens/OnboardingLifestyle";
import { OnboardingGoalsScreen } from "../screens/OnboardingGoals";
import ImportPreviewScreen from "../screens/ImportPreview";
import PasteRecipeScreen from "../screens/PasteRecipe";
import RecipeViewScreen from "../screens/RecipeView";
import AdaptScreen from "../screens/Adapt";
import AdaptSummaryScreen from "../screens/AdaptSummary";
import GroceryListScreen from "../screens/GroceryList";
import CookingPromptScreen from "../screens/CookingPrompt";
import CompletionFeedbackScreen from "../screens/CompletionFeedback";
import SalvageModeScreen from "../screens/SalvageMode";
import { ProfileScreen } from "../screens/Profile";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { completed, _hasHydrated, setHasHydrated } = useOnboardingStore();
  const { isAuthenticated, user } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [userCompleted, setUserCompleted] = useState<boolean | null>(null);

  // Wait for Zustand persist to hydrate
  useEffect(() => {
    if (_hasHydrated) {
      setIsReady(true);
    } else {
      // Fallback: set hydrated after a short delay if it doesn't happen automatically
      const timer = setTimeout(() => {
        if (!_hasHydrated) {
          setHasHydrated(true);
          setIsReady(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [_hasHydrated, setHasHydrated]);

  // Check user-specific onboarding completion
  useEffect(() => {
    if (isAuthenticated && user?.id && _hasHydrated) {
      getUserOnboardingCompleted(user.id).then(setUserCompleted);
    } else if (!isAuthenticated) {
      setUserCompleted(null);
    }
  }, [isAuthenticated, user?.id, _hasHydrated]);

  // Determine initial route based on auth and user-specific onboarding
  const getInitialRoute = () => {
    if (!isAuthenticated) {
      return "Login";
    }
    if (userCompleted === false) {
      return "Launch";
    }
    return "MainTabs";
  };

  // Show loading screen while waiting for hydration or checking completion
  if (!isReady || (isAuthenticated && userCompleted === null)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.backgroundSubtle }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={getInitialRoute()}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
            gestureEnabled: false, // Prevent going back to login after logging in
          }}
        />
        <Stack.Screen name="Launch" component={LaunchScreen} />
        <Stack.Screen name="OnboardingDiet" component={OnboardingDietScreen} />
        <Stack.Screen name="OnboardingAllergies" component={OnboardingAllergiesScreen} />
        <Stack.Screen name="OnboardingLifestyle" component={OnboardingLifestyleScreen} />
        <Stack.Screen name="OnboardingGoals" component={OnboardingGoalsScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="ImportPreview"
          component={ImportPreviewScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="PasteRecipe" component={PasteRecipeScreen} />
        <Stack.Screen
          name="RecipeView"
          component={RecipeViewScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Adapt"
          component={AdaptScreen}
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen name="AdaptSummary" component={AdaptSummaryScreen} />
        <Stack.Screen
          name="GroceryList"
          component={GroceryListScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="CookingPrompt" component={CookingPromptScreen} />
        <Stack.Screen name="CompletionFeedback" component={CompletionFeedbackScreen} />
        <Stack.Screen name="SalvageMode" component={SalvageModeScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
