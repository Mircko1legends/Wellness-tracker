import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { WeekChart } from "../components/WeekChart";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { WellnessEntry } from "../types";
import { formatShortLabel, lastNDateKeys } from "../utils/date";
import { goalsMet } from "../utils/streak";

export function HistoryScreen() {
  const { entries, goals } = useWellness();

  const last7 = lastNDateKeys(7);
  const byDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries]);

  const sleepData = last7.map((d) => byDate.get(d)?.sleepHours ?? 0);
  const waterData = last7.map((d) => byDate.get(d)?.waterGlasses ?? 0);
  const activityData = last7.map((d) => byDate.get(d)?.activityMinutes ?? 0);
  const labels = last7.map(formatShortLabel);

  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const renderItem = ({ item }: { item: WellnessEntry }) => {
    const met = goalsMet(item, goals);
    return (
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowDate}>{item.date}</Text>
          {met && <Text style={styles.metBadge}>Obiettivi raggiunti</Text>}
        </View>
        <Text style={styles.rowDetail}>
          😴 {item.sleepHours}h · 💧 {item.waterGlasses} · 🏃 {item.activityMinutes}min · 🙂 {item.mood}/5
        </Text>
        {!!item.notes && <Text style={styles.rowNotes}>{item.notes}</Text>}
      </View>
    );
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={recent}
      keyExtractor={(item) => item.date}
      renderItem={renderItem}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Storico</Text>
          <WeekChart title="Sonno (ore) - ultimi 7 giorni" labels={labels} data={sleepData} suffix="h" />
          <WeekChart title="Acqua (bicchieri) - ultimi 7 giorni" labels={labels} data={waterData} />
          <WeekChart title="Attività (min) - ultimi 7 giorni" labels={labels} data={activityData} />
          <Text style={styles.sectionLabel}>Tutte le registrazioni</Text>
        </>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>Nessuna registrazione ancora. Vai su "Registra" per iniziare.</Text>
      }
    />
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
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
