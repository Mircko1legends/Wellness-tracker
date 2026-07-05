import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, spacing } from "../theme";

export function WorkoutScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Allenamento" subtitle="Scheda a corpo libero, progressiva" />
      <View style={styles.content}>
        <Text style={styles.placeholder}>In arrivo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md },
  placeholder: { color: colors.textMuted },
});
