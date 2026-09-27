import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { LensGuard, LensGuardState } from "../../modules/lens-guard";
import { loadLensLog, loadLensSettings, saveLensLog, saveLensSettings } from "../storage/storage";
import {
  DEFAULT_LENS_SETTINGS,
  effectiveFriendMessage,
  LensDay,
  lensDayKey,
  LensSettings,
  markRemoved,
  toggleStep,
  undoRemoved,
} from "../utils/lens";

interface LensContextValue {
  loading: boolean;
  settings: LensSettings;
  log: LensDay[];
  today: LensDay;
  guard: LensGuardState | null; // null where the native guard isn't available (web)
  updateSettings: (next: LensSettings) => Promise<void>;
  toggleTodayStep: (stepId: string) => Promise<void>;
  confirmRemovedToday: () => Promise<void>;
  undoRemovedToday: () => Promise<void>;
  requestSmsPermission: () => Promise<boolean>;
  refreshGuard: () => void;
}

const LensContext = createContext<LensContextValue | undefined>(undefined);

export const isLensGuardAvailable = LensGuard !== null;

function pushToGuard(settings: LensSettings): LensGuardState | null {
  if (!LensGuard) return null;
  return LensGuard.configure({
    enabled: settings.enabled && settings.friendPhone.trim().length > 0,
    hour: settings.deadlineHour,
    minute: settings.deadlineMinute,
    reminderOffsets: settings.reminderOffsets,
    phone: settings.friendPhone.trim(),
    friendName: settings.friendName.trim(),
    message: effectiveFriendMessage(settings),
  });
}

export function LensProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<LensSettings>(DEFAULT_LENS_SETTINGS);
  const [log, setLog] = useState<LensDay[]>([]);
  const [guard, setGuard] = useState<LensGuardState | null>(null);
  const [dayKey, setDayKey] = useState(() => lensDayKey(new Date()));

  const refreshGuard = useCallback(() => {
    setDayKey(lensDayKey(new Date()));
    if (LensGuard) setGuard(LensGuard.getState());
  }, []);

  useEffect(() => {
    (async () => {
      const [loadedSettings, loadedLog] = await Promise.all([loadLensSettings(), loadLensLog()]);
      setSettings(loadedSettings);
      setLog(loadedLog);
      // Storage is the source of truth: re-arm the native guard (also after a restore or reinstall).
      setGuard(pushToGuard(loadedSettings));
      setLoading(false);
    })();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshGuard();
    });
    return () => subscription.remove();
  }, [refreshGuard]);

  const updateSettings = async (next: LensSettings) => {
    setSettings(next);
    await saveLensSettings(next);
    setGuard(pushToGuard(next));
  };

  const updateLog = async (next: LensDay[]) => {
    setLog(next);
    await saveLensLog(next);
  };

  const today = log.find((d) => d.date === dayKey) ?? { date: dayKey, doneSteps: [] };

  const confirmRemovedToday = async () => {
    if (LensGuard) setGuard(LensGuard.confirmRemoved());
    await updateLog(markRemoved(log, dayKey, Date.now()));
  };

  const undoRemovedToday = async () => {
    if (LensGuard) setGuard(LensGuard.undoConfirmation());
    await updateLog(undoRemoved(log, dayKey));
  };

  const requestSmsPermission = async () => {
    if (Platform.OS !== "android") return false;
    // The phone permission is only used to pick a SIM when the phone asks every time which one to use.
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ]);
    refreshGuard();
    return result[PermissionsAndroid.PERMISSIONS.SEND_SMS] === PermissionsAndroid.RESULTS.GRANTED;
  };

  return (
    <LensContext.Provider
      value={{
        loading,
        settings,
        log,
        today,
        guard,
        updateSettings,
        toggleTodayStep: (stepId) => updateLog(toggleStep(log, dayKey, stepId)),
        confirmRemovedToday,
        undoRemovedToday,
        requestSmsPermission,
        refreshGuard,
      }}
    >
      {children}
    </LensContext.Provider>
  );
}

export function useLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useLens must be used within LensProvider");
  return ctx;
}
