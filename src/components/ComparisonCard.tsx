import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { MetricAverage, WeeklyComparison } from "../utils/comparison";

interface RowConfig {
  key: keyof WeeklyComparison;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  unit: string;
  decimals: number;
  higherIsBetter: boolean;
}

const ROWS: RowConfig[] = [
  { key: "sleepHours", label: "Sonno", icon: "moon-outline", unit: "h", decimals: 1, higherIsBetter: true },
  { key: "waterGlasses", label: "Acqua", icon: "water-outline", unit: "bicchieri", decimals: 1, higherIsBetter: true },
  { key: "setsCompleted", label: "Serie/giorno", icon: "barbell-outline", unit: "serie", decimals: 1, higherIsBetter: true },
  { key: "mood", label: "Umore", icon: "happy-outline", unit: "/5", decimals: 1, higherIsBetter: true },
];

function formatValue(value: number | null, decimals: number): string {
  return value === null ? "—" : value.toFixed(decimals);
}

function Trend({ metric, higherIsBetter }: { metric: MetricAverage; higherIsBetter: boolean }) {
  if (metric.current === null || metric.previous === null) {
    return <Text style={styles.trendNeutral}>—</Text>;
  }
  const diff = metric.current - metric.previous;
  if (Math.abs(diff) < 0.05) {
    return (
      <View style={styles.trendRow}>
        <Ionicons name="remove-outline" size={14} color={colors.textMuted} />
        <Text style={styles.trendNeutral}>stabile</Text>
      </View>
    );
  }
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  return (
    <View style={styles.trendRow}>
      <Ionicons
        name={diff > 0 ? "trending-up" : "trending-down"}
        size={14}
        color={improved ? colors.success : colors.danger}
      />
      <Text style={[styles.trendText, { color: improved ? colors.success : colors.danger }]}>
        {diff > 0 ? "+" : ""}
        {diff.toFixed(1)}
      </Text>
    </View>
  );
}

export function ComparisonCard({ comparison }: { comparison: WeeklyComparison }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Questa settimana vs la scorsa</Text>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { flex: 1.3 }]} />
        <Text style={styles.legendText}>Corrente</Text>
        <Text style={styles.legendText}>Scorsa</Text>
        <Text style={styles.legendText}>Trend</Text>
      </View>
      {ROWS.map((row) => {
        const metric = comparison[row.key];
        return (
          <View key={row.key} style={styles.row}>
            <View style={styles.labelWrap}>
              <Ionicons name={row.icon} size={16} color={colors.primary} />
              <Text style={styles.label}>{row.label}</Text>
            </View>
            <Text style={styles.value}>
              {formatValue(metric.current, row.decimals)}{" "}
              <Text style={styles.unit}>{row.unit}</Text>
            </Text>
            <Text style={styles.value}>
              {formatValue(metric.previous, row.decimals)}{" "}
              <Text style={styles.unit}>{row.unit}</Text>
            </Text>
            <Trend metric={metric} higherIsBetter={row.higherIsBetter} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1.3,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  value: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  unit: {
    fontSize: 10,
    fontWeight: "400",
    color: colors.textMuted,
  },
  trendRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "700",
  },
  trendNeutral: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    textAlign: "center",
  },
});
