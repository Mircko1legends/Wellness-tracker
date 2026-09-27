import * as Notifications from "expo-notifications";
import { Platform, Vibration } from "react-native";
import { channelId, ensureSoundChannels, soundContent } from "../notificationChannels";
import { isNotificationsSupported, requestNotificationPermission } from "../notifications";

export const REST_PREFIX = "rest-";
const ID = `${REST_PREFIX}timer`;

/** Alarm that rings even with the screen off or the app in the background. */
export async function scheduleRestAlarm(seconds: number, exercise: string): Promise<void> {
  await cancelRestAlarm();
  if (!isNotificationsSupported || !(await requestNotificationPermission())) return;
  await ensureSoundChannels().catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: { title: "Recupero finito", body: `Prossima serie: ${exercise}`, ...soundContent("rest") },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      channelId: channelId("rest"),
    },
  });
}

export async function cancelRestAlarm(): Promise<void> {
  if (!isNotificationsSupported) return;
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
}

/** In-app signal when the timer ends while the screen is open. */
export function ringNow(): void {
  if (Platform.OS !== "web") {
    Vibration.vibrate([0, 400, 200, 400]);
    return;
  }
  try {
    const Ctx = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch {
    // no audio available: the on-screen message is enough
  }
}
