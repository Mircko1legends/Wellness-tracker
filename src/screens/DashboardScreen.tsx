import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatCard } from "../components/StatCard";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { todayKey } from "../utils/date";

export function DashboardScreen() {
  const { goals, streak, getEntryForDate } = useWellness();
  const entry = getEntryForDate(todayKey());

  const today = new Date();
  const dateLabel = today.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.dateLabel}>{dateLabel}</Text>
      <Text style={styles.title}>Il tuo benessere oggi</Text>

      <View style={styles.streakCard}>
        <Ionicons name="flame" size={28} color={colors.accent} />
        <View style={{ marginLeft: spacing.sm }}>
          <Text style={styles.streakValue}>{streak} {streak === 1 ? "giorno" : "giorni"}</Text>
          <Text style={styles.streakLabel}>di streak con obiettivi raggiunti</Text>
        </View>
      </View>

      {!entry && (
        <View style={styles.reminderCard}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.reminderText}>
            Non hai ancora registrato la giornata di oggi. Vai su "Registra" per aggiungerla.
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        <StatCard
          icon="moon-outline"
          label="Sonno"
          value={entry ? `${entry.sleepHours}h` : "—"}
          goalLabel={`Obiettivo: ${goals.sleepHours}h`}
          progress={entry ? entry.sleepHours / goals.sleepHours : 0}
          met={!!entry && entry.sleepHours >= goals.sleepHours}
        />
        <StatCard
          icon="water-outline"
          label="Acqua"
          value={entry ? `${entry.waterGlasses}` : "—"}
          goalLabel={`Obiettivo: ${goals.waterGlasses} bicchieri`}
          progress={entry ? entry.waterGlasses / goals.waterGlasses : 0}
          met={!!entry && entry.waterGlasses >= goals.waterGlasses}
        />
        <StatCard
          icon="walk-outline"
          label="Attività"
          value={entry ? `${entry.activityMinutes}min` : "—"}
          goalLabel={`Obiettivo: ${goals.activityMinutes}min`}
          progress={entry ? entry.activityMinutes / goals.activityMinutes : 0}
          met={!!entry && entry.activityMinutes >= goals.activityMinutes}
        />
        <StatCard
          icon="happy-outline"
          label="Umore"
          value={entry ? `${entry.mood}/5` : "—"}
          goalLabel={`Minimo: ${goals.moodMin}/5`}
          progress={entry ? entry.mood / 5 : 0}
          met={!!entry && entry.mood >= goals.moodMin}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  dateLabel: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  streakLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FDF3E7",
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reminderText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryDark,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
