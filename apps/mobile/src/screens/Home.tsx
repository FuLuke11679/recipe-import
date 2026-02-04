import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from "react-native";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import { PrimaryButton, TextInputField, EmptyState, LoadingState } from "../components";
import { colors, spacing, typography } from "../theme";
import { listRecipes } from "../api/client";
import { RootStackParamList } from "../navigation/types";
import { TabParamList } from "../navigation/TabNavigator";
import { ImportJob } from "../../../packages/shared/types";

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: HomeNavigationProp;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState("");

  // Fetch recipes for authenticated user
  const { data: recipes, isLoading: recipesLoading, refetch: refetchRecipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => listRecipes(),
    staleTime: 0, // Always consider data stale to allow refetching
    refetchOnWindowFocus: true, // Refetch when screen comes into focus
  });

  // Refresh recipes when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetchRecipes();
    }, [refetchRecipes])
  );

  useEffect(() => {
    // Handle deep links and share intents
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleIncomingURL(initialUrl);
      }
    };

    handleInitialURL();

    const subscription = Linking.addEventListener("url", ({ url: incomingUrl }) => {
      handleIncomingURL(incomingUrl);
    });

    return () => subscription.remove();
  }, []);

  const handleIncomingURL = (incomingUrl: string) => {
    // Parse TikTok URL from share intent or deep link
    let tiktokUrl = incomingUrl;
    
    // Handle deep link format: cooked://import?url=... or recipeimport://import?url=...
    if (incomingUrl.startsWith("cooked://") || incomingUrl.startsWith("recipeimport://")) {
      const parsed = Linking.parse(incomingUrl);
      tiktokUrl = (parsed.queryParams?.url as string) || incomingUrl;
    }

    // Extract TikTok URL if present (handles both direct URLs and text containing URLs)
    // Check if the string contains a TikTok URL pattern
    const tiktokUrlMatch = tiktokUrl.match(/https?:\/\/(www\.)?(vm\.|vt\.)?tiktok\.com\/[^\s]+/i);
    if (tiktokUrlMatch) {
      const extractedUrl = tiktokUrlMatch[0];
      setUrl(extractedUrl);
      handleImport(extractedUrl);
    } else if (tiktokUrl.includes("tiktok.com")) {
      // Fallback: if it contains tiktok.com but didn't match regex, use as-is
      setUrl(tiktokUrl);
      handleImport(tiktokUrl);
    }
  };

  const handleImport = async (targetUrl?: string) => {
    const effectiveUrl = targetUrl || url.trim();
    if (!effectiveUrl) {
      return;
    }

    // Navigate to ImportPreview with URL
    // Authentication is handled automatically by the API client
    navigation.navigate("ImportPreview", { url: effectiveUrl });
  };

  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setUrl(text);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Cooked</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="cog" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Import Recipe</Text>
        <TextInputField
          placeholder="Paste TikTok URL here..."
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton title="Import" onPress={() => handleImport()} />
        
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>My Recipes</Text>
          {recipesLoading ? (
            <LoadingState message="Loading recipes..." />
          ) : recipes && recipes.length > 0 ? (
            <FlatList
              data={recipes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                // Only show recipes that have been extracted
                const recipe = item.adapted_recipe || item.parsed_recipe;
                if (!recipe) return null;
                
                const title = recipe.title || "Untitled Recipe";
                return (
                  <TouchableOpacity
                    style={styles.recentItem}
                    onPress={() => {
                      navigation.navigate("RecipeView", { importId: item.id });
                    }}
                  >
                    <Text style={styles.recentItemTitle}>{title}</Text>
                    <Text style={styles.recentItemDate}>
                      {formatDate(item.created_at)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              scrollEnabled={false}
            />
          ) : (
            <EmptyState message="No recipes imported yet. Import your first recipe from TikTok!" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSubtle,
  },
  header: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    ...typography.title,
  },
  profileButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  recentSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.section,
    marginBottom: spacing.md,
  },
  recentItem: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentItemTitle: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  recentItemDate: {
    ...typography.caption,
  },
});

export default HomeScreen;
