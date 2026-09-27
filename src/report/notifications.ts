import * as Notifications from "expo-notifications";
import { channelId, ensureSoundChannels, soundContent } from "../notificationChannels";
import { isNotificationsSupported, requestNotificationPermission } from "../notifications";
import { parseDateKey, todayKey } from "../utils/date";
import { brainstormDates } from "./weekly";

const PREFIX = "brainstorm-";
const HOUR = 20;

/** One-off reminders for the next Sunday evenings; re-synced every time the app starts. */
export async function syncBrainstormReminders(): Promise<void> {
  if (!isNotificationsSupported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
  if (!(await requestNotificationPermission())) return;
  await ensureSoundChannels().catch(() => {});
  for (const date of brainstormDates(todayKey())) {
    const when = parseDateKey(date);
    when.setHours(HOUR, 0, 0, 0);
    if (when.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${date}`,
      content: {
        title: "Brainstorm della domenica",
        body: "Apri Altro → Resoconto settimana, copia il testo e incollalo nella chat con Claude.",
        ...soundContent("routine"),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: channelId("routine") },
    });
  }
}
