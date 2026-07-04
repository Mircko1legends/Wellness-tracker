import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatCard } from "../components/StatCard";
import { useWellness } from "../context/WellnessContext";
import { colors, metricColors, radii, spacing } from "../theme";
import { todayKey } from "../utils/date";

export function DashboardScreen() {
  const { goals, streak, level, getEntryForDate } = useWellness();
  const entry = getEntryForDate(todayKey());

  const today = new Date();
  const dateLabel = today.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.container}>
      <ScreenHeader
        eyebrow={dateLabel}
        title="Il tuo benessere"
        right={
          <View style={styles.badgeRow}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color={colors.accent} />
              <Text style={styles.streakBadgeText}>{streak}</Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="star" size={14} color={colors.accent} />
              <Text style={styles.streakBadgeText}>Lv.{level.level}</Text>
            </View>
          </View>
        }
        footer={
          <View style={styles.xpBarWrap}>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${level.progress * 100}%` }]} />
            </View>
            <Text style={styles.xpLabel}>
              {level.xpIntoLevel}/{level.xpForNextLevel} XP al livello {level.level + 1}
            </Text>
          </View>
        }
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
            accentColor={metricColors.sleep.fg}
            accentBg={metricColors.sleep.bg}
          />
          <StatCard
            icon="water-outline"
            label="Acqua"
            value={entry ? `${entry.waterGlasses}` : "—"}
            goalLabel={`Obiettivo: ${goals.waterGlasses} bicchieri`}
            progress={entry ? entry.waterGlasses / goals.waterGlasses : 0}
            met={!!entry && entry.waterGlasses >= goals.waterGlasses}
            accentColor={metricColors.water.fg}
            accentBg={metricColors.water.bg}
          />
          <StatCard
            icon="walk-outline"
            label="Attività"
            value={entry ? `${entry.activityMinutes}min` : "—"}
            goalLabel={`Obiettivo: ${goals.activityMinutes}min`}
            progress={entry ? entry.activityMinutes / goals.activityMinutes : 0}
            met={!!entry && entry.activityMinutes >= goals.activityMinutes}
            accentColor={metricColors.activity.fg}
            accentBg={metricColors.activity.bg}
          />
          <StatCard
            icon="happy-outline"
            label="Umore"
            value={entry ? `${entry.mood}/5` : "—"}
            goalLabel={`Minimo: ${goals.moodMin}/5`}
            progress={entry ? entry.mood / 5 : 0}
            met={!!entry && entry.mood >= goals.moodMin}
            accentColor={metricColors.mood.fg}
            accentBg={metricColors.mood.bg}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  streakBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  xpBarWrap: {
    marginTop: spacing.md,
  },
  xpTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  xpLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    fontWeight: "600",
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FDF3E7",
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
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
    marginTop: spacing.sm,
  },
});
