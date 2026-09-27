import * as Notifications from "expo-notifications";
import { STEP_CATEGORY } from "../notificationActions";
import { channelId, ensureSoundChannels, SoundKind, soundContent, soundForActivity } from "../notificationChannels";
import { isNotificationsSupported, requestNotificationPermission } from "../notifications";
import { todayKey } from "../utils/date";
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
  sound: SoundKind;
}

/** Same time + text on every weekday collapses into one daily notification. */
/** `today` hides activities that start later (e.g. the Sunday brainstorm from October 4): the app re-syncs every start. */
export function planNotifications(plan: TimelinePlan, eachStep: boolean, today?: string): Planned[] {
  const byKey = new Map<string, Planned>();
  const add = (weekday: number, time: string, title: string, body: string, sound: SoundKind, activity?: Planned["activity"]) => {
    const key = `${time}|${title}|${body}`;
    const [hour, minute] = time.split(":").map(Number);
    const entry = byKey.get(key) ?? { hour, minute, title, body, weekdays: new Set<number>(), activity, sound };
    entry.weekdays.add(weekday);
    byKey.set(key, entry);
  };
  for (let weekday = 0; weekday < 7; weekday++) {
    // No week passed: odd/even-week variants are both included and share one notification via `group`.
    for (const activity of dayTimeline(plan, weekday, undefined, today)) {
      const [first, ...rest] = activity.steps;
      const name = activity.group ?? activity.title;
      const sound = soundForActivity(activity.title, activity.kind);
      if (activity.weeks) {
        add(weekday, activity.start, `${activity.start} · ${name}`, "La scheda di questa settimana è nell'app.", sound, { time: activity.start, name });
        continue;
      }
      const more = rest.length ? ` (+${rest.length} passi)` : "";
      add(weekday, activity.start, `${activity.start} · ${name}`, `${first?.label ?? "Inizia"}${more}`, sound, { time: activity.start, name });
      if (eachStep) rest.forEach((step) => add(weekday, step.time, `${step.time} · ${name}`, step.label, sound));
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
  const planned = planNotifications(plan, eachStep, todayKey());
  if (planned.length === 0 || !(await requestNotificationPermission())) return 0;
  await ensureSoundChannels().catch(() => {});

  let count = 0;
  for (const [i, p] of planned.entries()) {
    const content: Notifications.NotificationContentInput = p.activity
      ? { title: p.title, body: p.body, categoryIdentifier: STEP_CATEGORY, data: { kind: "step", ...p.activity }, ...soundContent(p.sound) }
      : { title: p.title, body: p.body, ...soundContent(p.sound) };
    if (p.weekdays.size === 7) {
      if (count >= MAX_SCHEDULED) break;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${i}-d`,
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: p.hour, minute: p.minute, channelId: channelId(p.sound) },
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
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: weekday + 1,
          hour: p.hour,
          minute: p.minute,
          channelId: channelId(p.sound),
        },
      });
      count++;
    }
  }
  return count;
}
