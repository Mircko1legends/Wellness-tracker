import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { useWellness } from "../context/WellnessContext";
import { COOKING_RULES, EQUIPMENT, RECIPES, SAVING_VERSION, SHOPPING_LIST, SHOPPING_TOTAL, SUBSTITUTIONS } from "../data/nutritionSystem";
import type { DietStackParamList } from "../navigation/DietStack";
import { colors, radii, spacing } from "../theme";
import { MENU_REFERENCE_KG, weightSteps } from "../timeline/scaling";
import { todayKey } from "../utils/date";
import { isoWeekLabel } from "../utils/weeklyTable";

type Props = NativeStackScreenProps<DietStackParamList, "Recipes">;

const CHECKED_KEY = "@wellness/shoppingChecked";

/** Daily needs from the Nutrition system table: 42 kcal/kg on gym days, 38 on rest days, 1.8 g/kg protein, 0.9 g/kg fat. */
function needs(kg: number) {
  const protein = Math.round(kg * 1.8);
  const fat = Math.round(kg * 0.9);
  const gym = Math.round((kg * 42) / 10) * 10;
  const rest = Math.round((kg * 38) / 10) * 10;
  return { gym, rest, protein, fat, carbs: Math.round((gym - protein * 4 - fat * 9) / 4) };
}

export function RecipesScreen({ navigation }: Props) {
  const { bodyweightKg } = useWellness();
  const week = isoWeekLabel(todayKey());
  const [checked, setChecked] = useState<string[]>([]);
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CHECKED_KEY)
      .then((raw) => {
        const saved = raw ? JSON.parse(raw) : null;
        setChecked(saved?.week === week ? saved.ids : []);
      })
      .catch(() => {});
  }, [week]);

  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    setChecked(next);
    AsyncStorage.setItem(CHECKED_KEY, JSON.stringify({ week, ids: next })).catch(() => {});
  };

  const n = needs(bodyweightKg);
  const steps = weightSteps(bodyweightKg);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Spesa, ricette e sostituzioni" subtitle="Dal tuo Nutrition system" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Il tuo fabbisogno a {String(bodyweightKg).replace(".", ",")} kg</Text>
          <Text style={styles.line}>Giorni di palestra: {n.gym} kcal · riposo: {n.rest} kcal</Text>
          <Text style={styles.line}>Proteine {n.protein} g · grassi {n.fat} g · carboidrati ~{n.carbs} g</Text>
          <Text style={styles.hint}>
            Proteine distribuite su 4–5 pasti (circa 30 g a pasto). Il menu è scritto per {MENU_REFERENCE_KG} kg: l'app ha già tolto
            {steps < 0 ? ` ${-steps * 30} g di pasta o riso a pranzo e a cena e lo spuntino serale facoltativo` : steps > 0 ? ` aggiunto ${steps * 30} g di pasta o riso a pranzo e a cena` : " niente, sei nella fascia di riferimento"}.
            Ogni pasto ha 4 pezzi: proteina, carboidrato, verdura, grasso.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Lista della spesa · {week}</Text>
          <Text style={styles.hint}>Copre esattamente il menu della settimana: circa {SHOPPING_TOTAL} € (prezzi indicativi da discount).</Text>
          {SHOPPING_LIST.map((item) => {
            const on = checked.includes(item.id);
            return (
              <TouchableOpacity key={item.id} style={styles.shopRow} onPress={() => toggle(item.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Ionicons name={on ? "checkbox" : "square-outline"} size={20} color={on ? colors.success : colors.textMuted} />
                <Text style={[styles.shopName, on && styles.done]}>{item.name}</Text>
                <Text style={styles.shopQty}>{item.quantity}</Text>
                <Text style={styles.shopCost}>{item.cost.toFixed(2).replace(".", ",")} €</Text>
              </TouchableOpacity>
            );
          })}
          <Text style={[styles.hint, { marginTop: spacing.sm }]}>{SAVING_VERSION}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Se manca qualcosa: sostituisci</Text>
          {SUBSTITUTIONS.map(([a, b]) => (
            <Text key={a} style={styles.line}>
              <Text style={{ fontWeight: "800" }}>{a}</Text> → {b}
            </Text>
          ))}
          <Text style={styles.hint}>Nessun alimento di questa dieta è obbligatorio: sostituisci e vai avanti.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Le 8 ricette del menu</Text>
          {RECIPES.map((r) => {
            const open = openRecipe === r.name;
            return (
              <View key={r.name} style={styles.recipe}>
                <TouchableOpacity style={styles.recipeHead} onPress={() => setOpenRecipe(open ? null : r.name)}>
                  <Text style={styles.recipeName}>{r.name}</Text>
                  <Text style={styles.hint}>{r.time}</Text>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                </TouchableOpacity>
                {open && (
                  <>
                    <Text style={styles.line}>{r.ingredients}</Text>
                    {r.steps.map((st, i) => (
                      <Text key={i} style={styles.line}>
                        {i + 1}. {st}
                      </Text>
                    ))}
                  </>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Regole di cucina</Text>
          {COOKING_RULES.map((r) => (
            <Text key={r} style={styles.line}>
              • {r}
            </Text>
          ))}
          <Text style={[styles.hint, { marginTop: spacing.sm }]}>{EQUIPMENT}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 6 },
  line: { fontSize: 13, color: colors.text, lineHeight: 20 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  shopRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 5 },
  shopName: { flex: 1, color: colors.text, fontSize: 13 },
  shopQty: { color: colors.textMuted, fontSize: 12 },
  shopCost: { color: colors.text, fontSize: 12, width: 52, textAlign: "right" },
  done: { textDecorationLine: "line-through", color: colors.textMuted },
  recipe: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  recipeHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  recipeName: { flex: 1, color: colors.text, fontWeight: "700", fontSize: 14 },
});
