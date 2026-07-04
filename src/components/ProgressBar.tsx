import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, radii } from "../theme";

interface Props {
  progress: number; // 0..1
  color?: string;
}

export function ProgressBar({ progress, color = colors.primary }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
  },
});
