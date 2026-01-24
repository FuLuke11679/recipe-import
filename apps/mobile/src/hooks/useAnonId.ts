import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Generate a unique ID - use simple approach for React Native compatibility
function generateId() {
  // Use timestamp + random string for uniqueness
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `anon-${timestamp}-${random}`;
}

export function useAnonId() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // On web, SecureStore is not available – just use an in-memory ID.
        if (Platform.OS === "web") {
          const next = generateId();
          setId(next);
          return;
        }

        const existing = await SecureStore.getItemAsync("anon_user_id");
        if (existing) {
          setId(existing);
          return;
        }
        const next = generateId();
        await SecureStore.setItemAsync("anon_user_id", next);
        setId(next);
      } catch {
        // Fallback: always have some ID even if SecureStore fails.
        setId((current) => current ?? generateId());
      }
    }
    load();
  }, []);

  return id;
}

