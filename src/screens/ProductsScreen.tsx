import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { BudgetTier, BUDGET_GUIDES } from "../data/productGuide";
import { colors, radii, spacing } from "../theme";

export function ProductsScreen() {
  const navigation = useNavigation();
  const [tier, setTier] = useState<BudgetTier>("low");
  const guide = BUDGET_GUIDES.find((g) => g.tier === tier)!;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Prodotti"
        subtitle="Skincare, hair care e integratori per budget"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tierRow}>
          {BUDGET_GUIDES.map((g) => {
            const selected = g.tier === tier;
            return (
              <TouchableOpacity
                key={g.tier}
                style={[styles.tierButton, selected && styles.tierButtonSelected]}
                onPress={() => setTier(g.tier)}
              >
                <Text style={[styles.tierButtonText, selected && styles.tierButtonTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.intro}>{guide.intro}</Text>

        {guide.categories.map((category) => (
          <View key={category.title} style={styles.card}>
            <View style={styles.categoryHeader}>
              <Ionicons name={(category.icon as any) ?? "pricetag-outline"} size={18} color={colors.primary} />
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>
            {category.items.map((item) => (
              <View key={item.name} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemNote}>{item.note}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.disclaimerText}>
            Indicazioni generiche su categorie e ingredienti, non consigli medici. Per farmaci su
            prescrizione, dosaggi di integratori o condizioni specifiche, parlane sempre con un
            medico o uno specialista.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  tierRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tierButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
  },
  tierButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.cardAlt,
  },
  tierButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  tierButtonTextSelected: {
    color: colors.primary,
  },
  intro: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  itemRow: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  itemNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
