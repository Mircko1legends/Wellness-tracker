import { createContext, useContext } from "react";

/** Remounts the data providers so they re-read storage, e.g. after a restore. */
export const AppReloadContext = createContext<() => void>(() => {});

export function useAppReload() {
  return useContext(AppReloadContext);
}
