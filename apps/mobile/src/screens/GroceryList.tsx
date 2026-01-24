import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import { PrimaryButton, SecondaryButton, GroceryListSection, LoadingState, ErrorState } from "../components";
import { colors, spacing, typography } from "../theme";
import { getGroceryList } from "../api/client";
import { GroceryItem } from "../../../packages/shared/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "GroceryList">;

// Group items by category (mock categories for now)
const groupByCategory = (items: GroceryItem[]): Record<string, GroceryItem[]> => {
  const grouped: Record<string, GroceryItem[]> = {};
  items.forEach((item) => {
    // Mock category assignment - replace with actual category from API
    const category = "Pantry"; // Default category
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });
  return grouped;
};

export const GroceryListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ["groceryList", importId],
    queryFn: () => getGroceryList(importId),
  });

  if (isLoading) {
    return <LoadingState message="Loading grocery list..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error?.message || "Failed to load grocery list"}
        onRetry={() => {}}
      />
    );
  }

  const items = (data?.items || []) as GroceryItem[];
  const groupedItems = groupByCategory(items);

  const toggleItem = (category: string, index: number) => {
    const categoryItems = groupedItems[category];
    const globalIndex = Object.keys(groupedItems)
      .slice(0, Object.keys(groupedItems).indexOf(category))
      .reduce((sum, cat) => sum + groupedItems[cat].length, 0) + index;
    
    const newChecked = new Set(checkedItems);
    if (newChecked.has(globalIndex)) {
      newChecked.delete(globalIndex);
    } else {
      newChecked.add(globalIndex);
    }
    setCheckedItems(newChecked);
  };

  const handleShare = async () => {
    const lines = items.map((item, idx) => {
      const checked = checkedItems.has(idx) ? "[x]" : "[ ]";
      const parts: string[] = [];
      if (item.quantity) parts.push(String(item.quantity));
      if (item.unit) parts.push(item.unit);
      parts.push(item.name);
      return `${checked} ${parts.join(" ")}`;
    });
    const text = `${data?.recipe_title || "Grocery List"}\n\n${lines.join("\n")}`;
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync({ text });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grocery List</Text>
        <Text style={styles.subtitle}>Already have it? Tap to check.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const startIndex = Object.keys(groupedItems)
            .slice(0, Object.keys(groupedItems).indexOf(category))
            .reduce((sum, cat) => sum + groupedItems[cat].length, 0);
          
          return (
            <GroceryListSection
              key={category}
              title={category}
              items={categoryItems.map((item, idx) => ({
                ...item,
                checked: checkedItems.has(startIndex + idx),
              }))}
              onToggleItem={(idx) => toggleItem(category, idx)}
            />
          );
        })}
      </ScrollView>
      <View style={styles.buttonContainer}>
        <View style={styles.backButton}>
          <SecondaryButton
            title="Back to Recipe"
            onPress={() => navigation.goBack()}
          />
        </View>
        <PrimaryButton title="Share list" onPress={handleShare} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.secondary,
  },
  content: {
    padding: spacing.lg,
  },
  buttonContainer: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    marginBottom: spacing.sm,
  },
});

export default GroceryListScreen;
