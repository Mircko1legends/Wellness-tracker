import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useWater } from "../context/WaterContext";
import { colors, metricColors, radii, spacing } from "../theme";
import { targetGlasses } from "../water/water";

export function WaterCard() {
  const { settings, todayGlasses, add } = useWater();
  const target = targetGlasses(settings);
  const liters = ((todayGlasses * settings.glassMl) / 1000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  const pct = Math.min(1, todayGlasses / target);

  return (
    <View style={styles.card}>
      <Ionicons name="water" size={22} color={metricColors.water.fg} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          Acqua {todayGlasses}/{target} bicchieri · {liters || "0"} L
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
        {settings.enabled && (
          <Text style={styles.hint}>
            Promemoria ogni {settings.intervalMin}′ dalle {settings.start} alle {settings.end}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.small} onPress={() => add(-1)} accessibilityLabel="Togli un bicchiere">
        <Ionicons name="remove" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.big} onPress={() => add(1)} accessibilityLabel="Aggiungi un bicchiere">
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
  track: { height: 6, backgroundColor: colors.cardAlt, borderRadius: 3, marginTop: 6, overflow: "hidden" },
  fill: { height: 6, backgroundColor: metricColors.water.fg },
  small: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  big: { width: 48, height: 40, borderRadius: radii.md, backgroundColor: metricColors.water.fg, alignItems: "center", justifyContent: "center" },
  bigText: { color: colors.background, fontWeight: "900", fontSize: 16 },
});
