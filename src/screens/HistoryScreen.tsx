import { useNavigation } from "@react-navigation/native";
import { formatMood } from "../utils/mood";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { ComparisonCard } from "../components/ComparisonCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { WeekChart } from "../components/WeekChart";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { WellnessEntry } from "../types";
import { computeWeeklyComparison } from "../utils/comparison";
import { formatShortLabel, lastNDateKeys } from "../utils/date";
import { dayGoals, toHalfHours, trainingMinutes } from "../progress/lifeProgress";
import { useLifeProgress } from "../progress/useLifeProgress";

export function HistoryScreen() {
  const navigation = useNavigation();
  const { entries } = useWellness();
  const progress = useLifeProgress();

  const last7 = lastNDateKeys(7);
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);
  const hoursOn = (date: string) => {
    if (!progress) return 0;
    const manual = byDate.get(date)?.trainingHours;
    return manual ?? toHalfHours(trainingMinutes(progress.data.plan, progress.data.timelineLog, date).done);
  };
  const comparison = useMemo(() => computeWeeklyComparison(entries, hoursOn), [entries, progress]);

  const sleepData = last7.map((d) => byDate.get(d)?.sleepHours ?? 0);
  const waterData = last7.map((d) => byDate.get(d)?.waterBottles ?? 0);
  const trainingData = last7.map(hoursOn);
  const labels = last7.map(formatShortLabel);

  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const renderItem = ({ item }: { item: WellnessEntry }) => {
    const met = progress ? dayGoals(progress.data, item.date)?.all : false;
    return (
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowDate}>{item.date}</Text>
          {met && <Text style={styles.metBadge}>Obiettivi raggiunti</Text>}
        </View>
        <Text style={styles.rowDetail}>
          😴 {item.sleepHours}h · 💧 {item.waterBottles} · 🏋️ {String(hoursOn(item.date)).replace(".", ",")} h · 🙂 umore {formatMood(item.mood)}
        </Text>
        {!!item.notes && <Text style={styles.rowNotes}>{item.notes}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Storico"
        subtitle="Confronti e andamento settimanale"
        onBack={() => navigation.goBack()}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={recent}
        keyExtractor={(item) => item.date}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <ComparisonCard comparison={comparison} />
            <WeekChart title="Sonno (ore) - ultimi 7 giorni" labels={labels} data={sleepData} suffix="h" />
            <WeekChart title="Acqua (bottigliette) - ultimi 7 giorni" labels={labels} data={waterData} />
            <WeekChart title="Allenamento (ore) - ultimi 7 giorni" labels={labels} data={trainingData} suffix="h" />
            <Text style={styles.sectionLabel}>Tutte le registrazioni</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nessuna registrazione ancora. Vai su "Registra" per iniziare.</Text>
        }
      />
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  rowDate: {
    fontWeight: "700",
    color: colors.text,
  },
  metBadge: {
    fontSize: 11,
    color: colors.success,
    fontWeight: "600",
  },
  rowDetail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  rowNotes: {
    fontSize: 12,
    color: colors.text,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});
