import { NavigatorScreenParams } from "@react-navigation/native";
import { TabParamList } from "./TabNavigator";

export type RootStackParamList = {
  Login: undefined;
  Launch: undefined;
  OnboardingDiet: undefined;
  OnboardingAllergies: undefined;
  OnboardingLifestyle: undefined;
  OnboardingGoals: undefined;
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  Home: undefined;
  RecipesList: undefined;
  ImportPreview: { url?: string; importId?: string };
  PasteRecipe: { importId?: string; mode?: "import" | "manual" };
  RecipeView: { importId: string };
  Adapt: { importId: string };
  AdaptSummary: { importId: string };
  GroceryList: { importId: string };
  CookingPrompt: { importId: string };
  CompletionFeedback: { importId: string };
  SalvageMode: undefined;
  Profile: undefined;
};
