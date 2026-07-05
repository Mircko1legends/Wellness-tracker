import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Medication, ReminderSettings } from "./types";

const REMINDER_IDENTIFIER = "wellness-daily-reminder";
const MEDICATION_PREFIX = "medication-";

export const isNotificationsSupported = Platform.OS !== "web";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
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

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: "Wellness check-in",
      body: "Don't forget to log your mood, sleep, water and activity today!",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.hour,
      minute: settings.minute,
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

  for (const medication of enabledMedications) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${MEDICATION_PREFIX}${medication.id}`,
      content: {
        title: "Promemoria farmaco",
        body: `È ora di prendere: ${medication.name}${medication.dosage ? ` (${medication.dosage})` : ""}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: medication.hour,
        minute: medication.minute,
      },
    });
  }
}
