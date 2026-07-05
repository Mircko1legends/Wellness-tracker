import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { BUDGET_FOODS, BUDGET_TIPS, SAMPLE_MEAL_PLAN } from "../data/dietGuide";
import { colors, radii, spacing } from "../theme";
import { calculateLeanBulkTargets } from "../utils/nutrition";

export function DietScreen() {
  const { bodyweightKg, updateBodyweightKg } = useWellness();
  const targets = useMemo(() => calculateLeanBulkTargets(bodyweightKg), [bodyweightKg]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dieta" subtitle="Massa magra, budget minimo" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Il tuo peso corporeo</Text>
          <StepperInput
            label="Peso"
            value={bodyweightKg}
            unit="kg"
            step={1}
            min={35}
            max={200}
            onChange={updateBodyweightKg}
          />

          <Text style={styles.sectionLabel}>Obiettivi giornalieri stimati</Text>
          <View style={styles.targetGrid}>
            <View style={styles.targetTile}>
              <Text style={styles.targetValue}>{targets.calories}</Text>
              <Text style={styles.targetLabel}>kcal</Text>
            </View>
            <View style={styles.targetTile}>
              <Text style={styles.targetValue}>{targets.proteinG}g</Text>
              <Text style={styles.targetLabel}>proteine</Text>
            </View>
            <View style={styles.targetTile}>
              <Text style={styles.targetValue}>{targets.carbsG}g</Text>
              <Text style={styles.targetLabel}>carboidrati</Text>
            </View>
            <View style={styles.targetTile}>
              <Text style={styles.targetValue}>{targets.fatG}g</Text>
              <Text style={styles.targetLabel}>grassi</Text>
            </View>
          </View>
          <Text style={styles.disclaimer}>
            Stima generica per una crescita muscolare pulita (surplus moderato, ~2g/kg di
            proteine). Non è un consiglio medico: adatta in base ai tuoi risultati o consulta un
            professionista per un piano personalizzato.
          </Text>
        </View>

        <Text style={styles.title}>Alimenti economici ad alto valore</Text>
        {BUDGET_FOODS.map((category) => (
          <View key={category.title} style={styles.card}>
            <View style={styles.categoryHeader}>
              <Ionicons name={(category.icon as any) ?? "restaurant-outline"} size={18} color={colors.primary} />
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>
            {category.items.map((item) => (
              <View key={item} style={styles.itemRow}>
                <View style={styles.bullet} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.title}>Piano giornaliero di esempio</Text>
        <View style={styles.card}>
          {SAMPLE_MEAL_PLAN.map((item) => (
            <View key={item.meal} style={styles.mealRow}>
              <Text style={styles.mealLabel}>{item.meal}</Text>
              <Text style={styles.mealSuggestion}>{item.suggestion}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.title}>Consigli per risparmiare</Text>
        <View style={styles.card}>
          {BUDGET_TIPS.map((tip) => (
            <View key={tip} style={styles.itemRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.itemText, { flex: 1, marginLeft: spacing.xs }]}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  targetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  targetTile: {
    flexBasis: "47%",
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: "center",
  },
  targetValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  targetLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 16,
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  itemText: {
    fontSize: 13,
    color: colors.text,
  },
  mealRow: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealSuggestion: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
  },
});
