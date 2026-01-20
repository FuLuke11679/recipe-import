import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { triggerAdapt } from "../api/client";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Adapt">;

const AdaptScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const [diet, setDiet] = useState("none");
  const [maxTime, setMaxTime] = useState<string>("");
  const [servings, setServings] = useState<string>("");
  const [allergies, setAllergies] = useState("");

  const submit = async () => {
    await triggerAdapt(importId, {
      diet,
      max_time: maxTime ? Number(maxTime) : null,
      servings: servings ? Number(servings) : null,
      allergies,
    } as any);
    navigation.navigate("RecipeView", { importId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Diet</Text>
      <View style={styles.chips}>
        {["none", "vegetarian", "vegan", "gluten-free"].map((d) => (
          <TouchableOpacity key={d} style={[styles.chip, diet === d && styles.chipActive]} onPress={() => setDiet(d)}>
            <Text style={styles.chipText}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Max time (minutes)"
        keyboardType="numeric"
        value={maxTime}
        onChangeText={setMaxTime}
      />
      <TextInput
        style={styles.input}
        placeholder="Servings (1-6)"
        keyboardType="numeric"
        value={servings}
        onChangeText={setServings}
      />
      <TextInput style={styles.input} placeholder="Allergies" value={allergies} onChangeText={setAllergies} />
      <Button title="Adapt" onPress={submit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { fontSize: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginVertical: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: "#ccc", borderRadius: 12, marginRight: 8, marginTop: 6 },
  chipActive: { backgroundColor: "#e0f2ff", borderColor: "#2196f3" },
  chipText: { textTransform: "capitalize" },
});

export default AdaptScreen;

