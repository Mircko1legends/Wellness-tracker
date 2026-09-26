import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MoodScore } from "../types";
import { colors, radii, spacing } from "../theme";
import { formatMood, MOOD_LEVELS, needsSupport } from "../utils/mood";

interface Props {
  value: MoodScore;
  onChange: (score: MoodScore) => void;
}

export function MoodPicker({ value, onChange }: Props) {
  return (
    <View>
      <Text style={styles.intro}>
        0 è la tua normalità. Su non vuol dire meglio: l'obiettivo è restare vicino a 0. Le descrizioni sono un punto di
        partenza da sistemare con la tua psicologa.
      </Text>
      {MOOD_LEVELS.map((level) => {
        const selected = level.value === value;
        return (
          <TouchableOpacity
            key={level.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Umore ${formatMood(level.value)}, ${level.label}`}
            onPress={() => onChange(level.value as MoodScore)}
            style={[styles.option, selected && { borderColor: level.color, backgroundColor: colors.cardAlt }]}
          >
            <View style={[styles.badge, { backgroundColor: level.color }]}>
              <Text style={styles.badgeText}>{formatMood(level.value)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{level.label}</Text>
              {selected && <Text style={styles.hint}>{level.hint}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
      {needsSupport(value) && (
        <View style={styles.support}>
          <Text style={styles.supportTitle}>Oggi non devi gestirla da solo</Text>
          <Text style={styles.supportText}>
            Scrivi o chiama oggi la tua psichiatra o psicologa, non aspettare il prossimo appuntamento. Se ti senti in
            pericolo chiama il 112. Per parlare con qualcuno subito: Telefono Amico 02 2327 2327.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 2,
  },
  badge: { width: 38, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#111", fontWeight: "800", fontSize: 13 },
  label: { fontSize: 14, color: colors.text },
  labelSelected: { fontWeight: "800" },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  support: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.cardAlt,
  },
  supportTitle: { fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 4 },
  supportText: { fontSize: 13, color: colors.text, lineHeight: 18 },
});
