import { StatusBar } from "expo-status-bar";
import React from "react";
import { WellnessProvider } from "./src/context/WellnessContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <WellnessProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </WellnessProvider>
  );
}
