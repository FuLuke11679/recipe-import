import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface OnboardingState {
  diet: string | null;
  allergies: string[];
  customAllergies: string[];
  maxTime: number | null;
  cookingConfidence: string | null;
  goals: string[];
  completed: boolean;
  _hasHydrated: boolean;
  setDiet: (diet: string | null) => void;
  addAllergy: (allergy: string) => void;
  removeAllergy: (allergy: string) => void;
  addCustomAllergy: (allergy: string) => void;
  removeCustomAllergy: (allergy: string) => void;
  setMaxTime: (time: number | null) => void;
  setCookingConfidence: (confidence: string | null) => void;
  addGoal: (goal: string) => void;
  removeGoal: (goal: string) => void;
  setCompleted: (completed: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      diet: null,
      allergies: [],
      customAllergies: [],
      maxTime: null,
      cookingConfidence: null,
      goals: [],
      completed: false,
      _hasHydrated: false,
      setDiet: (diet) => set({ diet }),
      addAllergy: (allergy) =>
        set((state) => ({
          allergies: state.allergies.includes(allergy)
            ? state.allergies
            : [...state.allergies, allergy],
        })),
      removeAllergy: (allergy) =>
        set((state) => ({
          allergies: state.allergies.filter((a) => a !== allergy),
        })),
      addCustomAllergy: (allergy) =>
        set((state) => ({
          customAllergies: state.customAllergies.includes(allergy)
            ? state.customAllergies
            : [...state.customAllergies, allergy],
        })),
      removeCustomAllergy: (allergy) =>
        set((state) => ({
          customAllergies: state.customAllergies.filter((a) => a !== allergy),
        })),
      setMaxTime: (maxTime) => set({ maxTime }),
      setCookingConfidence: (cookingConfidence) => set({ cookingConfidence }),
      addGoal: (goal) =>
        set((state) => ({
          goals: state.goals.includes(goal) ? state.goals : [...state.goals, goal],
        })),
      removeGoal: (goal) =>
        set((state) => ({
          goals: state.goals.filter((g) => g !== goal),
        })),
      setCompleted: (completed) => set({ completed }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      reset: () =>
        set({
          diet: null,
          allergies: [],
          customAllergies: [],
          maxTime: null,
          cookingConfidence: null,
          goals: [],
          completed: false,
        }),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Helper functions for user-specific onboarding completion
const USER_ONBOARDING_KEY = "user-onboarding-completion";

export const getUserOnboardingCompleted = async (userId: string): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(USER_ONBOARDING_KEY);
    if (!data) return false;
    const completions: Record<string, boolean> = JSON.parse(data);
    return completions[userId] === true;
  } catch (error) {
    console.error("Error reading user onboarding completion:", error);
    return false;
  }
};

export const setUserOnboardingCompleted = async (userId: string, completed: boolean): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(USER_ONBOARDING_KEY);
    const completions: Record<string, boolean> = data ? JSON.parse(data) : {};
    completions[userId] = completed;
    await AsyncStorage.setItem(USER_ONBOARDING_KEY, JSON.stringify(completions));
  } catch (error) {
    console.error("Error saving user onboarding completion:", error);
  }
};
