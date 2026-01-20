import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import HomeScreen from "./src/screens/Home";
import ImportPreviewScreen from "./src/screens/ImportPreview";
import PasteRecipeScreen from "./src/screens/PasteRecipe";
import RecipeViewScreen from "./src/screens/RecipeView";
import AdaptScreen from "./src/screens/Adapt";
import GroceryListScreen from "./src/screens/GroceryList";

export type RootStackParamList = {
  Home: undefined;
  ImportPreview: { importId: string };
  PasteRecipe: { importId: string };
  RecipeView: { importId: string };
  Adapt: { importId: string };
  GroceryList: { importId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ImportPreview" component={ImportPreviewScreen} />
        <Stack.Screen name="PasteRecipe" component={PasteRecipeScreen} />
        <Stack.Screen name="RecipeView" component={RecipeViewScreen} />
        <Stack.Screen name="Adapt" component={AdaptScreen} />
        <Stack.Screen name="GroceryList" component={GroceryListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

