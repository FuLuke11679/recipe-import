import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createImport } from "../api/client";
import { useAnonId } from "../hooks/useAnonId";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const userId = useAnonId();
  const [url, setUrl] = useState("");

  useEffect(() => {
    async function handleInitial() {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes("tiktok.com")) {
        setUrl(initialUrl);
        submit(initialUrl);
      }
    }
    handleInitial();
    const sub = Linking.addEventListener("url", ({ url: incoming }) => {
      if (incoming && incoming.includes("tiktok.com")) {
        setUrl(incoming);
        submit(incoming);
      }
    });
    return () => sub.remove();
  }, []);

  const submit = async (targetUrl?: string) => {
    if (!userId) return;
    const val = targetUrl || url;
    if (!val) {
      Alert.alert("Enter a TikTok URL");
      return;
    }
    try {
      const job = await createImport(val, userId);
      navigation.navigate("ImportPreview", { importId: job.id });
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    }
  };

  const pasteFromClipboard = async () => {
    const clip = await Clipboard.getStringAsync();
    if (clip) setUrl(clip);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Share a TikTok → Import recipe</Text>
      <TextInput
        style={styles.input}
        placeholder="Paste TikTok URL"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Paste from clipboard" onPress={pasteFromClipboard} />
      <View style={styles.spacer} />
      <Button title="Import" onPress={() => submit()} disabled={!userId} />
      <Text style={styles.note}>Android share intent supported via deep link.</Text>
      <Text style={styles.note}>iOS share extension TODO.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  spacer: { height: 12 },
  note: { color: "#555", marginTop: 8, fontSize: 12 },
});

export default HomeScreen;

