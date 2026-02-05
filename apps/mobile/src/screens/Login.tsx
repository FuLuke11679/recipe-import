import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation } from "@tanstack/react-query";
import { PrimaryButton, TextInputField, LoadingState, ErrorState } from "../components";
import { colors, spacing, typography } from "../theme";
import { login, register, getCurrentUser, LoginCredentials, RegisterData } from "../api/client";
import { useAuthStore } from "../state/authStore";
import { useOnboardingStore } from "../state/onboardingStore";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const setAuth = useAuthStore((state) => state.setAuth);
  const reset = useOnboardingStore((state) => state.reset);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: async (data) => {
      // Fetch user info using the token directly
      try {
        const user = await getCurrentUser(data.access_token);
        // Save both token and user info
        setAuth(data.access_token, user);
        // Navigate to main app - AppNavigator will handle routing based on onboarding
        navigation.replace("MainTabs");
      } catch (error: any) {
        console.error("Failed to fetch user info:", error);
        // Create a temporary user object with username
        const tempUser = {
          id: "",
          email: "",
          username: credentials.username,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        // Save token anyway so user can continue
        setAuth(data.access_token, tempUser);
        // Navigate to main app
        navigation.replace("MainTabs");
      }
    },
    onError: (error: any) => {
      Alert.alert("Login Failed", error?.message || "Invalid username or password");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => register(data),
    onSuccess: async () => {
      // Reset onboarding state for new account
      reset();
      // After registration, automatically login
      loginMutation.mutate({ username, password });
    },
    onError: (error: any) => {
      Alert.alert("Registration Failed", error?.message || "Failed to create account");
    },
  });

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (isLogin) {
      loginMutation.mutate({ username: username.trim(), password });
    } else {
      if (!email.trim()) {
        Alert.alert("Error", "Please enter your email");
        return;
      }
      registerMutation.mutate({
        username: username.trim(),
        email: email.trim(),
        password,
      });
    }
  };

  if (loginMutation.isPending || registerMutation.isPending) {
    return <LoadingState message={isLogin ? "Logging in..." : "Creating account..."} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Cooked</Text>
          <Text style={styles.subtitle}>
            {isLogin ? "Welcome back!" : "Create your account"}
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <TextInputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          )}
          <TextInputField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            secureTextEntry
            style={styles.input}
          />

          <PrimaryButton
            title={isLogin ? "Login" : "Create Account"}
            onPress={handleSubmit}
            style={styles.submitButton}
          />

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <Text
              style={styles.switchLink}
              onPress={() => {
                setIsLogin(!isLogin);
                setEmail("");
                setPassword("");
              }}
            >
              {isLogin ? "Sign up" : "Login"}
            </Text>
          </View>

          {isLogin && (
            <View style={styles.demoInfo}>
              <Text style={styles.demoText}>Demo Account:</Text>
              <Text style={styles.demoText}>Username: demo</Text>
              <Text style={styles.demoText}>Password: demo123</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  input: {
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  switchText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  switchLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
  },
  demoInfo: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
});
