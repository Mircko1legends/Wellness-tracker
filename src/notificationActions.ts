import * as Notifications from "expo-notifications";
import { isNotificationsSupported } from "./notifications";

export const STEP_CATEGORY = "timeline-step";
export const WATER_CATEGORY = "water-glass";

/**
 * Buttons shown under the notification. They open the app for a moment: with the app closed, Android would
 * otherwise drop the tap, and a lost "Fatto" is worse than a second of screen.
 */
export async function registerNotificationActions(): Promise<void> {
  if (!isNotificationsSupported) return;
  await Notifications.setNotificationCategoryAsync(STEP_CATEGORY, [
    { identifier: "done", buttonTitle: "Fatto ✓", options: { opensAppToForeground: true } },
    { identifier: "skip", buttonTitle: "Salta", options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(WATER_CATEGORY, [
    { identifier: "glass", buttonTitle: "+1 bicchiere", options: { opensAppToForeground: true } },
  ]);
}

export interface StepActionData {
  kind: "step";
  time: string; // activity start, "HH:MM"
  name: string; // activity group or title
}

export function isStepAction(data: unknown): data is StepActionData {
  const d = data as StepActionData | null;
  return !!d && d.kind === "step" && typeof d.time === "string" && typeof d.name === "string";
}
