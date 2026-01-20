import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity, Share, Alert, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { fetchGroceryList } from "../api/client";
import { RootStackParamList } from "../../App";
import { GroceryItem } from "../../../packages/shared/types";

type Props = NativeStackScreenProps<RootStackParamList, "GroceryList">;

const GroceryListScreen: React.FC<Props> = ({ route }) => {
  const { importId } = route.params;
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchGroceryList(importId);
        setItems(res.items as GroceryItem[]);
        setTitle(res.recipe_title);
      } catch (e: any) {
        Alert.alert("Failed", e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [importId]);

  const toggleItem = (index: number) => {
    const next = [...items];
    next[index] = { ...next[index], checked: !next[index].checked };
    setItems(next);
  };

  const onShare = async () => {
    const lines = items.map((i) => `${i.checked ? "[x]" : "[ ]"} ${i.name} ${i.quantity ?? ""} ${i.unit ?? ""}`);
    await Share.share({ message: `${title}\n${lines.join("\n")}` });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || "Grocery list"}</Text>
      <FlatList
        data={items}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.item} onPress={() => toggleItem(index)}>
            <Text style={[styles.itemText, item.checked && styles.checked]}>
              {item.checked ? "☑" : "☐"} {item.name} {item.quantity ?? ""} {item.unit ?? ""}
            </Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Share" onPress={onShare} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  item: { paddingVertical: 8 },
  itemText: { fontSize: 16 },
  checked: { textDecorationLine: "line-through", color: "#777" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default GroceryListScreen;

