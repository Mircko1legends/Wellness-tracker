import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MissionRow } from "../components/MissionRow";
import { ProgressRing } from "../components/ProgressRing";
import { ScreenHeader } from "../components/ScreenHeader";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { todayKey } from "../utils/date";
import { goalsMet } from "../utils/streak";

export function MissionsScreen() {
  const navigation = useNavigation();
  const { level, unlockedMissions, lockedMissions, nextMission, getEntryForDate, goals } =
    useWellness();

  const todayEntry = getEntryForDate(todayKey());
  const coreMetToday = !!todayEntry && goalsMet(todayEntry, goals);

  const isCompletedToday = (missionId: string, core: boolean) => {
    if (!todayEntry) return false;
    if (core) return coreMetToday;
    return (todayEntry.bonusMissions ?? []).includes(missionId);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Missioni"
        subtitle={`${level.totalXp} XP totali guadagnati`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.levelCard}>
          <ProgressRing size={92} strokeWidth={8} progress={level.progress} color={colors.primary} trackColor={colors.border}>
            <Text style={styles.levelNumber}>{level.level}</Text>
            <Text style={styles.levelLabel}>LIVELLO</Text>
          </ProgressRing>
          <View style={styles.levelInfo}>
            <Text style={styles.levelXpText}>
              {level.xpIntoLevel} / {level.xpForNextLevel} XP
            </Text>
            <Text style={styles.levelHint}>al livello {level.level + 1}</Text>
            {nextMission && (
              <Text style={styles.nextUnlockText}>
                Prossimo sblocco: <Text style={styles.nextUnlockName}>{nextMission.name}</Text> (Lv.{" "}
                {nextMission.unlockLevel})
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Missioni sbloccate</Text>
        {unlockedMissions.map((mission) => (
          <MissionRow
            key={mission.id}
            mission={mission}
            locked={false}
            completedToday={isCompletedToday(mission.id, mission.core)}
          />
        ))}

        {lockedMissions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Da sbloccare</Text>
            {lockedMissions.map((mission) => (
              <MissionRow key={mission.id} mission={mission} locked />
            ))}
          </>
        )}
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
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  levelNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  levelInfo: {
    flex: 1,
  },
  levelXpText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  levelHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  nextUnlockText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  nextUnlockName: {
    fontWeight: "700",
    color: colors.primary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
});
