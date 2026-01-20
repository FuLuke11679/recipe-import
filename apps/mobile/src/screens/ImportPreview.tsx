import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { fetchImport } from "../api/client";
import { ImportJob } from "../../../packages/shared/types";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "ImportPreview">;

const ImportPreviewScreen: React.FC<Props> = ({ route, navigation }) => {
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

  if (!job) {
    return (
      <View style={styles.center}>
        <Text>Import not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Status: {job.status}</Text>
      {job.metadata?.title ? <Text>{job.metadata.title as string}</Text> : null}
      <View style={styles.row}>
        <Button title="Paste Recipe" onPress={() => navigation.navigate("PasteRecipe", { importId })} />
      </View>
      <View style={styles.row}>
        <Button title="View Recipe" onPress={() => navigation.navigate("RecipeView", { importId })} />
      </View>
      <Text style={styles.meta}>URL: {job.url}</Text>
      <Text style={styles.meta}>Updated: {job.updated_at}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  row: { marginVertical: 6 },
  meta: { color: "#555", fontSize: 12, marginTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default ImportPreviewScreen;

