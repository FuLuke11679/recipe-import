import Constants from "expo-constants";
import { ImportJob, Constraints, Recipe } from "../../../packages/shared/types";

const API_BASE = (Constants.expoConfig?.extra as any)?.apiBase || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Request failed");
  }
  return resp.json() as Promise<T>;
}

export async function createImport(url: string, userId: string): Promise<ImportJob> {
  return request<ImportJob>("/imports", { method: "POST", body: JSON.stringify({ url, user_id: userId }) });
}

export async function fetchImport(importId: string): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}`);
}

export async function submitRecipeText(importId: string, text: string): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}/recipe_text`, { method: "POST", body: JSON.stringify({ text }) });
}

export async function triggerExtract(importId: string): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}/extract`, { method: "POST", body: JSON.stringify({}) });
}

export async function triggerAdapt(importId: string, constraints: Constraints): Promise<ImportJob> {
  return request<ImportJob>(`/imports/${importId}/adapt`, { method: "POST", body: JSON.stringify({ constraints }) });
}

export async function fetchGroceryList(importId: string): Promise<{ items: any[]; recipe_title: string }> {
  return request(`/imports/${importId}/grocery_list`);
}

export function hasRecipe(job?: ImportJob | null): job is ImportJob & { parsed_recipe: Recipe } {
  return !!job?.parsed_recipe;
}

