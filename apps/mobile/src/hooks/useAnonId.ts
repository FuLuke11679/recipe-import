import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Generate a unique ID - use simple approach for React Native compatibility
function generateId() {
  // Use timestamp + random string for uniqueness
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `anon-${timestamp}-${random}`;
}

const STORAGE_KEY = "anon_user_id";

export function useAnonId() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        if (Platform.OS === "web") {
          // On web, use AsyncStorage (localStorage) for persistence
          const existing = await AsyncStorage.getItem(STORAGE_KEY);
          if (existing) {
            console.log("useAnonId: Loaded existing ID from AsyncStorage (web):", existing);
            setId(existing);
            return;
          }
          const next = generateId();
          await AsyncStorage.setItem(STORAGE_KEY, next);
          console.log("useAnonId: Generated new ID for web:", next);
          setId(next);
          return;
        }

        // On native platforms, use SecureStore
        const existing = await SecureStore.getItemAsync(STORAGE_KEY);
        if (existing) {
          console.log("useAnonId: Loaded existing ID from SecureStore:", existing);
          setId(existing);
          return;
        }
        const next = generateId();
        await SecureStore.setItemAsync(STORAGE_KEY, next);
        console.log("useAnonId: Generated new ID for native:", next);
        setId(next);
      } catch (error) {
        // Fallback: try AsyncStorage if SecureStore fails (e.g., on some platforms)
        console.warn("useAnonId: SecureStore failed, trying AsyncStorage:", error);
        try {
          const existing = await AsyncStorage.getItem(STORAGE_KEY);
          if (existing) {
            setId(existing);
            return;
          }
          const next = generateId();
          await AsyncStorage.setItem(STORAGE_KEY, next);
          setId(next);
        } catch (asyncError) {
          // Last resort: in-memory ID (will be lost on refresh)
          console.error("useAnonId: Both storage methods failed, using in-memory ID:", asyncError);
          setId((current) => current ?? generateId());
        }
      }
    }
    load();
  }, []);

  return id;
}

