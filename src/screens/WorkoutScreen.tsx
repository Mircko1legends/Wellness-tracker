import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { WorkoutDayCard } from "../components/WorkoutDayCard";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenHeader } from "../components/ScreenHeader";
import { useWellness } from "../context/WellnessContext";
import { WORKOUT_TIERS_BY_LEVEL } from "../data/workoutProgram";
import { colors, radii, spacing } from "../theme";
import { todayKey } from "../utils/date";

export function WorkoutScreen() {
  const { tierProgress, workoutLogs, workoutLoggedToday, logWorkout } = useWellness();
  const [feedback, setFeedback] = useState<{ xp: number; leveledUp: boolean; newLevel: number } | null>(
    null
  );

  const tier = WORKOUT_TIERS_BY_LEVEL[tierProgress.tier];
  const todayLog = workoutLogs.find((log) => log.date === todayKey());
  const progress = tierProgress.isMaxTier
    ? 1
    : tierProgress.sessionsCompleted / tierProgress.sessionsToUnlockNext;

  const handleComplete = async (dayId: string) => {
    const result = await logWorkout(dayId);
    setFeedback({ xp: result.xpEarned, leveledUp: result.leveledUp, newLevel: result.newLevel });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        eyebrow={`Livello ${tier.level}${tierProgress.isMaxTier ? " · Max" : ""}`}
        title={tier.name}
        subtitle={tier.description}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Sessioni in questo livello</Text>
            <Text style={styles.progressValue}>
              {tierProgress.isMaxTier
                ? `${tierProgress.sessionsCompleted}`
                : `${tierProgress.sessionsCompleted}/${tierProgress.sessionsToUnlockNext}`}
            </Text>
          </View>
          <ProgressBar progress={progress} color={colors.primary} />
          {!tierProgress.isMaxTier && (
            <Text style={styles.progressHint}>
              Completa altre {tierProgress.sessionsToUnlockNext - tierProgress.sessionsCompleted}{" "}
              {tierProgress.sessionsToUnlockNext - tierProgress.sessionsCompleted === 1
                ? "sessione"
                : "sessioni"}{" "}
              per sbloccare "{WORKOUT_TIERS_BY_LEVEL[tier.level + 1]?.name}"
            </Text>
          )}
        </View>

        {feedback && (
          <View style={styles.feedbackCard}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <Text style={styles.feedbackText}>
              {feedback.leveledUp
                ? `Livello raggiunto! Ora sei livello ${feedback.newLevel} (+${feedback.xp} XP)`
                : `+${feedback.xp} XP guadagnati`}
            </Text>
          </View>
        )}

        {workoutLoggedToday && !feedback && (
          <View style={styles.doneBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.doneBannerText}>Hai già completato l'allenamento di oggi. Ottimo lavoro!</Text>
          </View>
        )}

        {tier.days.map((day) => (
          <WorkoutDayCard
            key={day.id}
            day={day}
            completedToday={todayLog?.dayId === day.id}
            disabled={workoutLoggedToday && todayLog?.dayId !== day.id}
            onComplete={() => handleComplete(day.id)}
          />
        ))}

        <View style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Scheda 100% a corpo libero: nessun attrezzo e nessuna sbarra necessari. Il lavoro di
            "tirata" (schiena/bicipiti) è limitato dalla mancanza di attrezzatura: Superman e Y
            raise sono le migliori alternative disponibili.
          </Text>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  progressHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  feedbackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  doneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  doneBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
