import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useGoals } from "../context/GoalsContext";
import { goalProgress, nextMilestone } from "../goals/goals";
import { colors, radii, spacing } from "../theme";
import { formatMonth } from "../utils/finance";

/** The next milestone of the top-priority goal that still has one. */
export function NextGoalCard() {
  const navigation = useNavigation<any>();
  const { goals } = useGoals();
  const goal = goals.find((g) => nextMilestone(g));
  if (!goal) return null;
  const next = nextMilestone(goal)!;
  return (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("More", { screen: "LifeGoals" })} activeOpacity={0.85}>
      <Text style={styles.eyebrow}>
        OBIETTIVO {goal.priority} · {goalProgress(goal).percent}%
      </Text>
      <Text style={styles.title}>{goal.title}</Text>
      <Text style={styles.next}>
        Prossima tappa ({formatMonth(next.due)}): {next.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5 },
  title: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 2 },
  next: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
});
