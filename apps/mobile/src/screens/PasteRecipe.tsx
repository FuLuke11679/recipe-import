import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { submitRecipeText, triggerExtract } from "../api/client";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "PasteRecipe">;

const PasteRecipeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { importId } = route.params;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await submitRecipeText(importId, text);
      await triggerExtract(importId);
      navigation.navigate("RecipeView", { importId });
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Paste recipe text or caption</Text>
      <TextInput
        style={styles.input}
        placeholder="Full recipe text..."
        multiline
        numberOfLines={10}
        value={text}
        onChangeText={setText}
      />
      <Button title={loading ? "Submitting..." : "Submit"} onPress={submit} disabled={loading || !text} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, minHeight: 200, textAlignVertical: "top" },
});

export default PasteRecipeScreen;

