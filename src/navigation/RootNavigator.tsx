import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { DashboardScreen } from "../screens/DashboardScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { LogEntryScreen } from "../screens/LogEntryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { colors } from "../theme";

export type TabParamList = {
  Dashboard: undefined;
  Log: undefined;
  Goals: undefined;
  History: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, React.ComponentProps<typeof Ionicons>["name"]> = {
  Dashboard: "home-outline",
  Log: "add-circle-outline",
  Goals: "flag-outline",
  History: "stats-chart-outline",
  Settings: "settings-outline",
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONS[route.name as keyof TabParamList]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Oggi" }} />
        <Tab.Screen name="Log" component={LogEntryScreen} options={{ title: "Registra" }} />
        <Tab.Screen name="Goals" component={GoalsScreen} options={{ title: "Obiettivi" }} />
        <Tab.Screen name="History" component={HistoryScreen} options={{ title: "Storico" }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Impostazioni" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
