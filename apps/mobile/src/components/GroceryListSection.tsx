import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { spacing, typography, colors } from "../theme";
import { GroceryItem } from "../../../packages/shared/types";

interface GroceryListSectionProps {
  title: string;
  items: GroceryItem[];
  onToggleItem: (index: number) => void;
}

export const GroceryListSection: React.FC<GroceryListSectionProps> = ({
  title,
  items,
  onToggleItem,
}) => {
  const formatItem = (item: GroceryItem) => {
    const parts: string[] = [];
    // Format quantity nicely (remove trailing zeros, handle fractions)
    if (item.quantity != null) {
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity));
      if (!isNaN(qty)) {
        // Format as integer if whole number, otherwise show up to 2 decimals
        const formattedQty = qty % 1 === 0 ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '');
        parts.push(formattedQty);
      }
    }
    if (item.unit) {
      parts.push(item.unit);
    }
    parts.push(item.name);
    return parts.join(" ");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.item}
          onPress={() => onToggleItem(index)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.text, item.checked && styles.textChecked]}>
            {formatItem(item)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.section,
    marginBottom: spacing.md,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  text: {
    ...typography.body,
    flex: 1,
  },
  textChecked: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
});
