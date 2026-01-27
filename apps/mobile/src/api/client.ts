import Constants from "expo-constants";
import { Platform } from "react-native";
import { ImportJob, Constraints, Recipe } from "../../../packages/shared/types";
import { useAuthStore } from "../state/authStore";

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

async function request<T>(path: string, options?: RequestInit, requireAuth: boolean = true): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  // Merge headers from options first (allows overriding Content-Type or adding Authorization)
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      // Plain object
      Object.assign(headers, options.headers);
    }
  }
  
  // Add auth token if required and not already provided in options
  if (requireAuth && !headers["Authorization"]) {
    const token = useAuthStore.getState().token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn(`Request to ${path} requires auth but no token found`);
    }
  }
  
  const resp = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!resp.ok) {
    // Handle 401 Unauthorized - token expired or invalid
    if (resp.status === 401 && requireAuth) {
      console.error("401 Unauthorized - clearing auth");
      useAuthStore.getState().clearAuth();
      throw new Error("Authentication required. Please login again.");
    }
    const text = await resp.text();
    console.error(`Request failed: ${resp.status} ${path}`, text);
    throw new Error(text || `Request failed: ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// Authentication endpoints
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function login(credentials: LoginCredentials): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  }, false); // Don't require auth for login
}

export async function register(data: RegisterData): Promise<UserResponse> {
  return request<UserResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  }, false); // Don't require auth for registration
}

export async function getCurrentUser(token?: string): Promise<UserResponse> {
  // Allow passing token directly for use right after login
  if (token) {
    return request<UserResponse>("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }, false); // Don't require auth from store since we're passing it
  }
  return request<UserResponse>("/auth/me");
}

export async function createImport({ url }: { url: string }): Promise<ImportJob> {
  // user_id is now taken from authenticated user on backend
  return request<ImportJob>("/imports", { method: "POST", body: JSON.stringify({ url }) });
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

export async function listRecipes(): Promise<ImportJob[]> {
  // user_id is now taken from authenticated user on backend
  const url = `/recipes`;
  console.log("API: Fetching recipes from:", url);
  try {
    const result = await request<ImportJob[]>(url);
    console.log("API: Received", result?.length || 0, "recipes");
    return result;
  } catch (error) {
    console.error("API: Error fetching recipes:", error);
    throw error;
  }
}

export function hasRecipe(job?: ImportJob | null): job is ImportJob & { parsed_recipe: Recipe } {
  return !!job?.parsed_recipe;
}

