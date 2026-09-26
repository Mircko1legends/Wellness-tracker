import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { useGoals } from "../context/GoalsContext";
import { goalProgress, LifeGoal, milestoneTiming, nextMilestone } from "../goals/goals";
import { colors, radii, spacing } from "../theme";
import { formatMonth, monthKeyOf } from "../utils/finance";

function GoalCard({ goal }: { goal: LifeGoal }) {
  const { toggle } = useGoals();
  const [open, setOpen] = useState(false);
  const progress = goalProgress(goal);
  const next = nextMilestone(goal);
  const month = monthKeyOf(new Date());

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setOpen(!open)}>
        <View style={styles.row}>
          <Text style={styles.priority}>{goal.priority}</Text>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.percent}>{progress.percent}%</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress.percent}%` }]} />
        </View>
        {next && (
          <Text style={styles.next}>
            Prossimo: {next.title} · {formatMonth(next.due)}
            {milestoneTiming(next, month) === "past" ? " (si sposta pure, va bene così)" : ""}
          </Text>
        )}
        {!next && progress.total > 0 && <Text style={[styles.next, { color: colors.success }]}>Tutti i traguardi raggiunti</Text>}
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: spacing.sm }}>
          {goal.target && <Text style={styles.target}>Obiettivo: {goal.target}</Text>}
          {goal.milestones.map((m) => (
            <TouchableOpacity key={m.id} style={styles.milestone} onPress={() => toggle(goal.id, m.id)}>
              <Ionicons name={m.done ? "checkmark-circle" : "ellipse-outline"} size={20} color={m.done ? colors.success : colors.textMuted} />
              <Text style={styles.due}>{formatMonth(m.due).replace(/ \d{4}$/, "").slice(0, 3)}</Text>
              <Text style={[styles.mTitle, m.done && styles.mDone]}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export function LifeGoalsScreen() {
  const navigation = useNavigation();
  const { goals, loading } = useGoals();
  if (loading) return <View style={styles.container} />;
  return (
    <View style={styles.container}>
      <ScreenHeader title="I miei obiettivi" subtitle="In ordine di priorità, tappa per tappa" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {goals.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.next}>
              Nessun obiettivo ancora. Importa il file del tuo piano da Giornata → Importa routine: contiene obiettivi e
              tappe mese per mese.
            </Text>
          </View>
        )}
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
        {goals.length > 0 && (
          <Text style={styles.footer}>
            Una tappa in ritardo non azzera niente: si sposta al mese dopo. Conta la direzione, non il singolo mese.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  priority: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.cardAlt, color: colors.primary, textAlign: "center", lineHeight: 24, fontWeight: "900", fontSize: 12 },
  title: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.text },
  percent: { fontSize: 13, fontWeight: "800", color: colors.primary },
  track: { height: 6, backgroundColor: colors.cardAlt, borderRadius: 3, marginTop: spacing.sm, overflow: "hidden" },
  fill: { height: 6, backgroundColor: colors.primary },
  next: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 17 },
  target: { fontSize: 12, color: colors.text, marginBottom: spacing.xs },
  milestone: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: 5 },
  due: { width: 30, fontSize: 11, fontWeight: "700", color: colors.primary, marginTop: 3, textTransform: "capitalize" },
  mTitle: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  mDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  footer: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: spacing.sm, lineHeight: 17 },
});
