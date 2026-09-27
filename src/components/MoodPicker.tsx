import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { MoodScore } from "../types";
import { formatMood, moodLevel, needsSupport } from "../utils/mood";

interface Props {
  value: MoodScore;
  onChange: (score: MoodScore) => void;
}

type Face = "up" | "neutral" | "down";

const FACE_COLOR: Record<Face, string> = { up: "#FF9F43", neutral: "#3FD97F", down: "#4A86E8" };
const FACE_LABEL: Record<Face, string> = { up: "Su", neutral: "Neutro", down: "Giù" };

/** A face drawn with views: dots for eyes, the mouth curves up, stays flat or curves down. */
function FaceIcon({ face, color, size = 46 }: { face: Face; color: string; size?: number }) {
  const eye = size * 0.1;
  const mouthW = size * 0.42;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color, alignItems: "center" }}>
      <View style={{ flexDirection: "row", gap: size * 0.2, marginTop: size * 0.28 }}>
        <View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: color }} />
        <View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: color }} />
      </View>
      {face === "neutral" ? (
        <View style={{ width: mouthW, height: 3, borderRadius: 2, backgroundColor: color, marginTop: size * 0.16 }} />
      ) : (
        <View
          style={{
            width: mouthW,
            height: mouthW / 2,
            marginTop: face === "up" ? size * 0.05 : size * 0.16,
            borderColor: color,
            borderWidth: 3,
            ...(face === "up"
              ? { borderTopWidth: 0, borderBottomLeftRadius: mouthW / 2, borderBottomRightRadius: mouthW / 2 }
              : { borderBottomWidth: 0, borderTopLeftRadius: mouthW / 2, borderTopRightRadius: mouthW / 2 }),
          }}
        />
      )}
    </View>
  );
}

function faceOf(value: number): Face {
  return value > 0 ? "up" : value < 0 ? "down" : "neutral";
}

export function MoodPicker({ value, onChange }: Props) {
  const face = faceOf(value);
  const reveal = useRef(new Animated.Value(face === "neutral" ? 0 : 1)).current;
  useEffect(() => {
    Animated.spring(reveal, { toValue: face === "neutral" ? 0 : 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }, [face, reveal]);

  const pickFace = (f: Face) => {
    if (f === "neutral") onChange(0);
    else if (faceOf(value) !== f) onChange((f === "up" ? 1 : -1) as MoodScore);
  };

  const sign = face === "down" ? -1 : 1;
  const level = moodLevel(value);

  return (
    <View>
      <View style={styles.faces}>
        {(["down", "neutral", "up"] as Face[]).map((f) => {
          const selected = f === face;
          return (
            <TouchableOpacity
              key={f}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Umore ${FACE_LABEL[f]}`}
              onPress={() => pickFace(f)}
              style={[styles.face, selected && { borderColor: FACE_COLOR[f], backgroundColor: colors.cardAlt }]}
            >
              <FaceIcon face={f} color={selected ? FACE_COLOR[f] : colors.textMuted} />
              <Text style={[styles.faceLabel, selected && { color: FACE_COLOR[f] }]}>{FACE_LABEL[f]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {face !== "neutral" && (
        <Animated.View style={[styles.degrees, { opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>
          <Text style={styles.degreeTitle}>{face === "up" ? "Quanto su?" : "Quanto giù?"}</Text>
          <View style={styles.pills}>
            {[1, 2, 3, 4, 5].map((n) => {
              const v = (n * sign) as MoodScore;
              const lv = moodLevel(v);
              const selected = v === value;
              return (
                <TouchableOpacity
                  key={n}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Umore ${formatMood(v)}, ${lv.label}`}
                  onPress={() => onChange(v)}
                  style={styles.pillWrap}
                >
                  <View
                    style={[
                      styles.pill,
                      { height: 22 + n * 9, backgroundColor: selected ? lv.color : "transparent", borderColor: lv.color },
                    ]}
                  />
                  <Text style={[styles.pillNumber, selected && { color: lv.color }]}>{formatMood(v)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.levelLabel, { color: level.color }]}>{level.label}</Text>
          <Text style={styles.hint}>{level.hint}</Text>
        </Animated.View>
      )}
      {face === "neutral" && <Text style={[styles.hint, { textAlign: "center", marginTop: spacing.sm }]}>{moodLevel(0).hint}</Text>}

      <Text style={[styles.hint, { marginTop: spacing.sm }]}>
        0 è la tua normalità: stare su non vuol dire stare meglio, l'obiettivo è restare vicino a 0. Le descrizioni sono un
        punto di partenza da sistemare con la tua psicologa.
      </Text>

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
  faces: { flexDirection: "row", gap: spacing.sm },
  face: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  faceLabel: { color: colors.textMuted, fontWeight: "800", fontSize: 13 },
  degrees: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  degreeTitle: { color: colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.6 },
  pills: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: spacing.md },
  pillWrap: { alignItems: "center", gap: 6 },
  pill: { width: 30, borderRadius: 15, borderWidth: 2 },
  pillNumber: { color: colors.textMuted, fontWeight: "800", fontSize: 13 },
  levelLabel: { marginTop: spacing.sm, fontSize: 16, fontWeight: "900" },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, textAlign: "center" },
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
