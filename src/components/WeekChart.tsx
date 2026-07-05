import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { colors, radii, spacing } from "../theme";

interface Props {
  title: string;
  labels: string[];
  data: number[];
  suffix?: string;
}

const screenWidth = Dimensions.get("window").width;

export function WeekChart({ title, labels, data, suffix = "" }: Props) {
  const safeData = data.length > 0 ? data : [0];
  const safeLabels = labels.length > 0 ? labels : [""];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={{ labels: safeLabels, datasets: [{ data: safeData }] }}
        width={screenWidth - spacing.md * 4}
        height={160}
        yAxisSuffix={suffix}
        chartConfig={{
          backgroundGradientFrom: colors.card,
          backgroundGradientTo: colors.card,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(212, 255, 63, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(139, 148, 160, ${opacity})`,
          propsForDots: { r: "3" },
        }}
        bezier
        style={styles.chart}
      />
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
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: radii.md,
  },
});
