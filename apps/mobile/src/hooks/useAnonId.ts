import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";

// lightweight uuid fallback
function generateId() {
  if (uuidv4) {
    return uuidv4();
  }
  return `anon-${Math.random().toString(36).slice(2, 10)}`;
}

export function useAnonId() {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const existing = await SecureStore.getItemAsync("anon_user_id");
      if (existing) {
        setId(existing);
        return;
      }
      const next = generateId();
      await SecureStore.setItemAsync("anon_user_id", next);
      setId(next);
    }
    load();
  }, []);

  return id;
}

