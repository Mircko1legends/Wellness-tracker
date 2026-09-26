import * as Notifications from "expo-notifications";
import { isNotificationsSupported, requestNotificationPermission } from "../notifications";
import { reminderBody, reminderTimes, WaterSettings } from "./water";

const PREFIX = "water-";

export async function syncWaterReminders(settings: WaterSettings): Promise<number> {
  if (!isNotificationsSupported) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
  if (!settings.enabled || !(await requestNotificationPermission())) return 0;
  const times = reminderTimes(settings);
  for (const time of times) {
    const [hour, minute] = time.split(":").map(Number);
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${time}`,
      content: { title: "Bevi", body: reminderBody(settings) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }
  return times.length;
}
