import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { GoalsScreen } from "../screens/GoalsScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { MedicationsScreen } from "../screens/MedicationsScreen";
import { MissionsScreen } from "../screens/MissionsScreen";
import { MoreMenuScreen } from "../screens/MoreMenuScreen";
import { ProductsScreen } from "../screens/ProductsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export type MoreStackParamList = {
  MoreMenu: undefined;
  Medications: undefined;
  Products: undefined;
  Missions: undefined;
  Goals: undefined;
  History: undefined;
  Settings: undefined;
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
    </Stack.Navigator>
  );
}
