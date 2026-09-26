import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { colors, radii } from "../theme";
import { StepStatus } from "../timeline/plan";

/** ✓ fatto / ✗ saltato. Tapping the active one again clears it. */
export function StepButtons({ status, onChange }: { status: StepStatus; onChange: (s: StepStatus) => void }) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        accessibilityLabel="Fatto"
        style={[styles.button, status === "done" && styles.done]}
        onPress={() => onChange("done")}
        hitSlop={4}
      >
        <Ionicons name="checkmark" size={18} color={status === "done" ? colors.onPrimary : colors.success} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel="Saltato"
        style={[styles.button, status === "skipped" && styles.skipped]}
        onPress={() => onChange("skipped")}
        hitSlop={4}
      >
        <Ionicons name="close" size={18} color={status === "skipped" ? colors.text : colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  button: {
    width: 34,
    height: 30,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  done: { backgroundColor: colors.success, borderColor: colors.success },
  skipped: { backgroundColor: colors.cardAlt, borderColor: colors.textMuted },
});
