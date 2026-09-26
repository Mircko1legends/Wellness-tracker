import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { isBackupSupported, runBackup } from "./backup";

const MIN_INTERVAL_MS = 2 * 60 * 1000;
const STARTUP_DELAY_MS = 5000;

/** Backs up on startup and whenever the app goes to the background. */
export function useAutoBackup() {
  const lastRun = useRef(0);

  useEffect(() => {
    if (!isBackupSupported) return;
    const run = () => {
      if (Date.now() - lastRun.current < MIN_INTERVAL_MS) return;
      lastRun.current = Date.now();
      runBackup().catch(() => {});
    };
    const startup = setTimeout(run, STARTUP_DELAY_MS);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") run();
    });
    return () => {
      clearTimeout(startup);
      subscription.remove();
    };
  }, []);
}
