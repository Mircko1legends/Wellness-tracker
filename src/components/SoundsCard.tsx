import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { channelId, ensureSoundChannels, SOUND_CHANNELS, SoundKind, soundContent } from "../notificationChannels";
import { requestNotificationPermission } from "../notifications";
import { colors, radii, spacing } from "../theme";

const WEB_SOUNDS: Record<SoundKind, number> = {
  water: require("../../assets/sounds/water.wav"),
  meal: require("../../assets/sounds/meal.wav"),
  training: require("../../assets/sounds/training.wav"),
  study: require("../../assets/sounds/study.wav"),
  hygiene: require("../../assets/sounds/hygiene.wav"),
  lens: require("../../assets/sounds/lens.wav"),
  meds: require("../../assets/sounds/meds.wav"),
  sleep: require("../../assets/sounds/sleep.wav"),
  rest: require("../../assets/sounds/rest.wav"),
  routine: require("../../assets/sounds/routine.wav"),
};

async function play(kind: SoundKind) {
  if (Platform.OS === "web") {
    const src = WEB_SOUNDS[kind] as unknown as string | { uri: string };
    new Audio(typeof src === "string" ? src : src.uri).play().catch(() => {});
    return;
  }
  // On the phone the sound belongs to the notification channel: a test notification plays exactly what you'll hear.
  if (!(await requestNotificationPermission())) return;
  await ensureSoundChannels();
  await Notifications.scheduleNotificationAsync({
    content: { title: `Suono: ${SOUND_CHANNELS[kind].name}`, body: SOUND_CHANNELS[kind].description, ...soundContent(kind) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(kind) },
  });
}

/** Lets you learn the sounds: after a few weeks the sound alone says what to do. */
export function SoundsCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>I suoni delle notifiche</Text>
      <Text style={styles.hint}>
        Ogni tipo di attività ha il suo suono. Ascoltali qualche volta: col tempo basterà sentirlo per sapere cosa fare.
      </Text>
      {(Object.keys(SOUND_CHANNELS) as SoundKind[]).map((kind) => (
        <TouchableOpacity key={kind} style={styles.row} onPress={() => play(kind)} accessibilityLabel={`Ascolta ${SOUND_CHANNELS[kind].name}`}>
          <Ionicons name="play-circle" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{SOUND_CHANNELS[kind].name}</Text>
            <Text style={styles.hint}>{SOUND_CHANNELS[kind].description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6 },
  name: { color: colors.text, fontWeight: "700", fontSize: 14 },
});
