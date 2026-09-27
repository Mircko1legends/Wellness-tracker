import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { channelId, ensureSoundChannels, soundContent } from "./notificationChannels";
import { Medication, ReminderSettings } from "./types";

const REMINDER_IDENTIFIER = "wellness-daily-reminder";
const MEDICATION_PREFIX = "medication-";

export const isNotificationsSupported = Platform.OS !== "web";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // Each kind of activity has its own sound: play it also with the app open, so the habit forms around the sound.
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationsSupported) return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function syncDailyReminder(settings: ReminderSettings): Promise<void> {
  if (!isNotificationsSupported) return;

  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});

  if (!settings.enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;
  await ensureSoundChannels().catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: "Registra la giornata",
      body: "Umore, sonno e acqua di oggi: 30 secondi.",
      ...soundContent("routine"),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.hour,
      minute: settings.minute,
      channelId: channelId("routine"),
    },
  });
}

export async function syncMedicationReminders(medications: Medication[]): Promise<void> {
  if (!isNotificationsSupported) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(MEDICATION_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );

  const enabledMedications = medications.filter((m) => m.enabled);
  if (enabledMedications.length === 0) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;
  await ensureSoundChannels().catch(() => {});

  for (const medication of enabledMedications) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${MEDICATION_PREFIX}${medication.id}`,
      content: {
        title: "Promemoria farmaco",
        body: `È ora di prendere: ${medication.name}${medication.dosage ? ` (${medication.dosage})` : ""}`,
        ...soundContent("meds"),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: medication.hour,
        minute: medication.minute,
        channelId: channelId("meds"),
      },
    });
  }
}
