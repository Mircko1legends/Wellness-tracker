import * as Notifications from "expo-notifications";
import { STEP_CATEGORY } from "../notificationActions";
import { isNotificationsSupported, requestNotificationPermission } from "../notifications";
import { dayTimeline, TimelinePlan } from "./plan";

const PREFIX = "timeline-";
const MAX_SCHEDULED = 400; // Android caps alarms per app at 500; leave room for meds and reminders.

interface Planned {
  hour: number;
  minute: number;
  title: string;
  body: string;
  weekdays: Set<number>;
  /** Start notification of an activity: its buttons log the whole activity. */
  activity?: { time: string; name: string };
}

/** Same time + text on every weekday collapses into one daily notification. */
export function planNotifications(plan: TimelinePlan, eachStep: boolean): Planned[] {
  const byKey = new Map<string, Planned>();
  const add = (weekday: number, time: string, title: string, body: string, activity?: Planned["activity"]) => {
    const key = `${time}|${title}|${body}`;
    const [hour, minute] = time.split(":").map(Number);
    const entry = byKey.get(key) ?? { hour, minute, title, body, weekdays: new Set<number>(), activity };
    entry.weekdays.add(weekday);
    byKey.set(key, entry);
  };
  for (let weekday = 0; weekday < 7; weekday++) {
    // No week passed: odd/even-week variants are both included and share one notification via `group`.
    for (const activity of dayTimeline(plan, weekday)) {
      const [first, ...rest] = activity.steps;
      const name = activity.group ?? activity.title;
      if (activity.weeks) {
        add(weekday, activity.start, `${activity.start} · ${name}`, "La scheda di questa settimana è nell'app.", { time: activity.start, name });
        continue;
      }
      const more = rest.length ? ` (+${rest.length} passi)` : "";
      add(weekday, activity.start, `${activity.start} · ${name}`, `${first?.label ?? "Inizia"}${more}`, { time: activity.start, name });
      if (eachStep) rest.forEach((step) => add(weekday, step.time, `${step.time} · ${name}`, step.label));
    }
  }
  return [...byKey.values()];
}

export async function syncTimelineNotifications(plan: TimelinePlan, eachStep: boolean): Promise<number> {
  if (!isNotificationsSupported) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
  const planned = planNotifications(plan, eachStep);
  if (planned.length === 0 || !(await requestNotificationPermission())) return 0;

  let count = 0;
  for (const [i, p] of planned.entries()) {
    const content: Notifications.NotificationContentInput = p.activity
      ? { title: p.title, body: p.body, categoryIdentifier: STEP_CATEGORY, data: { kind: "step", ...p.activity } }
      : { title: p.title, body: p.body };
    if (p.weekdays.size === 7) {
      if (count >= MAX_SCHEDULED) break;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${i}-d`,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: p.hour, minute: p.minute },
      });
      count++;
      continue;
    }
    for (const weekday of p.weekdays) {
      if (count >= MAX_SCHEDULED) break;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${i}-w${weekday}`,
        content,
        // expo weekday: 1 = Sunday ... 7 = Saturday
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekday + 1, hour: p.hour, minute: p.minute },
      });
      count++;
    }
  }
  return count;
}
