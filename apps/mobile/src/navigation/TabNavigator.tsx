import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../theme";
import HomeScreen from "../screens/Home";
import RecipesListScreen from "../screens/RecipesList";

export type TabParamList = {
  Home: undefined;
  Recipes: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Import",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="download-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipesListScreen}
        options={{
          tabBarLabel: "My Recipes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
