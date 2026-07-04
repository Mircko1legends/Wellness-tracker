import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ReminderSettings } from "./types";

const REMINDER_IDENTIFIER = "wellness-daily-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function syncDailyReminder(settings: ReminderSettings): Promise<void> {
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

export const isNotificationsSupported = Platform.OS !== "web";
