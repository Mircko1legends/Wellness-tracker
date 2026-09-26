import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { useTimeline } from "../context/TimelineContext";
import { useWater } from "../context/WaterContext";
import { isStepAction, registerNotificationActions } from "../notificationActions";
import { isNotificationsSupported } from "../notifications";
import { dayTimeline } from "../timeline/plan";
import { todayKey } from "../utils/date";
import { isoWeekNumber } from "../utils/weeklyTable";

/** Turns taps on the notification buttons into logs (also when the tap is what launched the app). */
export function NotificationActionsBridge() {
  const { loading, plan, setSteps } = useTimeline();
  const { add } = useWater();
  const handled = useRef(new Set<string>());
  const latest = useRef({ plan, setSteps, add });
  latest.current = { plan, setSteps, add };

  useEffect(() => {
    if (!isNotificationsSupported || loading) return;
    registerNotificationActions().catch(() => {});

    const handle = async (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const action = response.actionIdentifier;
      const key = `${response.notification.request.identifier}|${response.notification.date}|${action}`;
      if (handled.current.has(key) || action === Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      handled.current.add(key);
      const data = response.notification.request.content.data;
      const { plan: p, setSteps: set, add: addWater } = latest.current;
      if (action === "glass") {
        await addWater(1);
      } else if ((action === "done" || action === "skip") && isStepAction(data)) {
        const date = todayKey();
        const activity = dayTimeline(p, new Date().getDay(), isoWeekNumber(date)).find(
          (a) => a.start === data.time && (a.group ?? a.title) === data.name
        );
        if (activity) await set(date, activity.steps.map((st) => st.id), action === "done" ? "done" : "skipped");
      }
      Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
    };

    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      handle(r).catch(() => {});
    });
    return () => sub.remove();
  }, [loading]);

  return null;
}
