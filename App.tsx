import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { NotificationActionsBridge } from "./src/components/NotificationActionsBridge";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppReloadContext } from "./src/backup/AppReload";
import { useAutoBackup } from "./src/backup/useAutoBackup";
import { LensProvider } from "./src/context/LensContext";
import { GoalsProvider } from "./src/context/GoalsContext";
import { TimelineProvider } from "./src/context/TimelineContext";
import { WaterProvider } from "./src/context/WaterContext";
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
            <TimelineProvider>
              <GoalsProvider>
                <WaterProvider>
                  <NotificationActionsBridge />
                  <RootNavigator />
                  <StatusBar style="light" />
                </WaterProvider>
              </GoalsProvider>
            </TimelineProvider>
          </LensProvider>
        </WellnessProvider>
      </AppReloadContext.Provider>
    </SafeAreaProvider>
  );
}
