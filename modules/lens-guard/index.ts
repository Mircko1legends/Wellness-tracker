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
  ignoringBatteryOptimizations: boolean;
}

interface LensGuardNative {
  configure(config: LensGuardConfig): LensGuardState;
  confirmRemoved(): LensGuardState;
  undoConfirmation(): LensGuardState;
  getState(): LensGuardState;
  openExactAlarmSettings(): void;
  openBatterySettings(): void;
  sendTestSms(phone: string, message: string): boolean;
}

/** null on web and in Expo Go: the guard only exists in the installed Android app. */
export const LensGuard = requireOptionalNativeModule<LensGuardNative>("LensGuard");
