import { requireOptionalNativeModule } from "expo-modules-core";

export interface LensGuardConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  reminderOffsets: number[]; // minutes before the deadline
  phone: string;
  friendName: string;
  message: string;
}

export interface LensGuardState extends LensGuardConfig {
  confirmedAt: number;
  lastAlertAt: number;
  lastAlertOk: boolean;
  nextDeadlineAt: number;
  exactAlarmsAllowed: boolean;
  smsPermission: boolean;
  smsAppOpAllowed: boolean;
  phoneStatePermission: boolean;
  defaultSmsSubscription: number; // -1 = no default SIM for SMS ("ask every time")
  activeSims: number; // -1 = unknown (needs the phone permission)
  androidVersion: number;
  ignoringBatteryOptimizations: boolean;
  lastSmsQueuedAt: number;
  lastSmsResultAt: number;
  lastSmsResultCode: number; // -1 = sent OK, 0 = no answer yet, >0 = Android error code
  lastSmsDeliveredAt: number;
  lastSmsError: string;
  lastSmsSubscription: number;
}

interface LensGuardNative {
  configure(config: LensGuardConfig): LensGuardState;
  confirmRemoved(): LensGuardState;
  undoConfirmation(): LensGuardState;
  getState(): LensGuardState;
  openExactAlarmSettings(): void;
  openBatterySettings(): void;
  openAppSettings(): void;
  sendTestSms(phone: string, message: string): boolean;
}

/** null on web and in Expo Go: the guard only exists in the installed Android app. */
export const LensGuard = requireOptionalNativeModule<LensGuardNative>("LensGuard");
