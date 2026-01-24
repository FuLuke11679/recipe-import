import Constants from "expo-constants";
import { Platform } from "react-native";
import { ImportJob, Constraints, Recipe } from "../../../packages/shared/types";

// Get API base URL from environment variable, with fallback for development
const getApiBase = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;
  
  // Fallback for development: Android emulator uses 10.0.2.2 to access host machine's localhost
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8000";
  }
  // Web and iOS simulator
  return "http://localhost:8000";
};

const API_BASE = getApiBase();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Request failed:", resp.status, text);
    throw new Error(text || `Request failed: ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export async function createImport({ userId, url }: { userId: string; url: string }): Promise<ImportJob> {
  return request<ImportJob>("/imports", { method: "POST", body: JSON.stringify({ url, user_id: userId }) });
}

export async function getImport(importId: string): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}`);
}

export async function submitRecipeText(importId: string, text: string): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}/recipe_text`, { method: "POST", body: JSON.stringify({ text }) });
}

export async function extractRecipe(importId: string): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}/extract`, { method: "POST", body: JSON.stringify({}) });
}

export async function adaptRecipe(importId: string, constraints: Constraints): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}/adapt`, { method: "POST", body: JSON.stringify({ constraints }) });
}

export async function getGroceryList(importId: string): Promise<{ items: any[]; recipe_title: string }> {
  return request(`/imports/${importId}/grocery_list`);
}

export async function listRecipes(userId: string): Promise<ImportJob[]> {
  return request<ImportJob[]>(`/recipes?user_id=${encodeURIComponent(userId)}`);
}

export function hasRecipe(job?: ImportJob | null): job is ImportJob & { parsed_recipe: Recipe } {
  return !!job?.parsed_recipe;
}

