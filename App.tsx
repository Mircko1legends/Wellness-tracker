import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WellnessProvider } from "./src/context/WellnessContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <WellnessProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </WellnessProvider>
    </SafeAreaProvider>
  );
}
