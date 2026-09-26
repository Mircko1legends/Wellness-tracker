import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppReloadContext } from "./src/backup/AppReload";
import { useAutoBackup } from "./src/backup/useAutoBackup";
import { LensProvider } from "./src/context/LensContext";
import { WellnessProvider } from "./src/context/WellnessContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  useAutoBackup();

  return (
    <SafeAreaProvider>
      <AppReloadContext.Provider value={reload}>
        <WellnessProvider key={reloadKey}>
          <LensProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </LensProvider>
        </WellnessProvider>
      </AppReloadContext.Provider>
    </SafeAreaProvider>
  );
}
