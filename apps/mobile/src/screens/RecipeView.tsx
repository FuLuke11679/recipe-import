import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Button, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { fetchImport } from "../api/client";
import { ImportJob } from "../../../packages/shared/types";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeView">;

const RecipeViewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const [job, setJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchImport(importId);
      setJob(data);
      setLoading(false);
    };
    load();
  }, [importId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!job?.parsed_recipe) {
    return (
      <View style={styles.center}>
        <Text>No parsed recipe yet.</Text>
        <Button title="Paste Recipe" onPress={() => navigation.navigate("PasteRecipe", { importId })} />
      </View>
    );
  }

  const recipe = job.adapted_recipe || job.parsed_recipe;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{recipe.title}</Text>
      <Text style={styles.section}>Ingredients</Text>
      {recipe.ingredients.map((ing, idx) => (
        <Text key={idx} style={styles.item}>
          - {ing.name} {ing.quantity ?? ""} {ing.unit ?? ""}
        </Text>
      ))}
      <Text style={styles.section}>Steps</Text>
      {recipe.steps.map((step, idx) => (
        <Text key={idx} style={styles.item}>
          {idx + 1}. {step.instruction}
        </Text>
      ))}
      <View style={styles.actions}>
        <Button title="Adapt" onPress={() => navigation.navigate("Adapt", { importId })} />
        <Button title="Grocery List" onPress={() => navigation.navigate("GroceryList", { importId })} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  section: { fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  item: { marginVertical: 2 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default RecipeViewScreen;

