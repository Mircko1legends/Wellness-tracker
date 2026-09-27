import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useWater } from "../context/WaterContext";
import { colors, metricColors, radii, spacing } from "../theme";
import { litersText, sipShare, targetBottles } from "../water/water";

export function WaterCard() {
  const { settings, todayBottles, add } = useWater();
  const target = targetBottles(settings);
  const pct = Math.min(1, todayBottles / target);

  return (
    <View style={styles.card}>
      <Ionicons name="water" size={22} color={metricColors.water.fg} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          Acqua {todayBottles}/{target} bottigliette · {litersText(todayBottles, settings.bottleMl)} L
        </Text>
        <View style={styles.track}>
          {Array.from({ length: target }, (_, i) => (
            <View key={i} style={[styles.bottle, i < todayBottles && styles.bottleFull]} />
          ))}
        </View>
        {settings.enabled && (
          <Text style={styles.hint}>
            Sorsi ogni {settings.intervalMin}′ (circa {sipShare(settings)} di bottiglietta). Segna solo quando ne finisci una.
          </Text>
        )}
        {pct >= 1 && <Text style={styles.done}>Obiettivo raggiunto</Text>}
      </View>
      <TouchableOpacity style={styles.small} onPress={() => add(-1)} accessibilityLabel="Togli una bottiglietta">
        <Ionicons name="remove" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.big} onPress={() => add(1)} accessibilityLabel="Bottiglietta finita">
        <Text style={styles.bigText}>+1</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: metricColors.water.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { fontSize: 14, fontWeight: "800", color: colors.text },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  done: { fontSize: 11, color: colors.success, fontWeight: "700", marginTop: 2 },
  track: { flexDirection: "row", gap: 3, marginTop: 6 },
  bottle: { flex: 1, height: 14, borderRadius: 3, borderWidth: 1, borderColor: metricColors.water.fg, opacity: 0.5 },
  bottleFull: { backgroundColor: metricColors.water.fg, opacity: 1 },
  small: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  big: { width: 48, height: 40, borderRadius: radii.md, backgroundColor: metricColors.water.fg, alignItems: "center", justifyContent: "center" },
  bigText: { color: colors.background, fontWeight: "900", fontSize: 16 },
});
