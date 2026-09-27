import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { CheckinScreen } from "../screens/CheckinScreen";
import { FinanceScreen } from "../screens/FinanceScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { LensScreen } from "../screens/LensScreen";
import { LifeGoalsScreen } from "../screens/LifeGoalsScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { MedicationsScreen } from "../screens/MedicationsScreen";
import { MissionsScreen } from "../screens/MissionsScreen";
import { MoreMenuScreen } from "../screens/MoreMenuScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { WeekReportScreen } from "../screens/WeekReportScreen";
import { ProgressPhotosScreen } from "../screens/ProgressPhotosScreen";
import { DevicesScreen } from "../screens/DevicesScreen";

export type MoreStackParamList = {
  MoreMenu: undefined;
  Medications: undefined;
  Products: undefined;
  Missions: undefined;
  Goals: undefined;
  History: undefined;
  Settings: undefined;
  Checkin: undefined;
  Finance: undefined;
  Lens: undefined;
  LifeGoals: undefined;
  WeekReport: undefined;
  ProgressPhotos: undefined;
  Devices: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <Stack.Screen name="Medications" component={MedicationsScreen} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="Missions" component={MissionsScreen} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Checkin" component={CheckinScreen} />
      <Stack.Screen name="Finance" component={FinanceScreen} />
      <Stack.Screen name="Lens" component={LensScreen} />
      <Stack.Screen name="LifeGoals" component={LifeGoalsScreen} />
      <Stack.Screen name="WeekReport" component={WeekReportScreen} />
      <Stack.Screen name="ProgressPhotos" component={ProgressPhotosScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
    </Stack.Navigator>
  );
}
