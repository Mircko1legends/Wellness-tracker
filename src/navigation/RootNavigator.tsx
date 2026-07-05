import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { DashboardScreen } from "../screens/DashboardScreen";
import { DietScreen } from "../screens/DietScreen";
import { LogEntryScreen } from "../screens/LogEntryScreen";
import { WorkoutScreen } from "../screens/WorkoutScreen";
import { colors } from "../theme";
import { MoreStack } from "./MoreStack";

export type TabParamList = {
  Dashboard: undefined;
  Log: undefined;
  Workout: undefined;
  Diet: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, React.ComponentProps<typeof Ionicons>["name"]> = {
  Dashboard: "home-outline",
  Log: "add-circle-outline",
  Workout: "barbell-outline",
  Diet: "restaurant-outline",
  More: "menu-outline",
};

export function RootNavigator() {
  return (
    <NavigationContainer documentTitle={{ enabled: false }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 10 },
          tabBarStyle: { backgroundColor: colors.backgroundElevated, borderTopColor: colors.border },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONS[route.name as keyof TabParamList]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: "Oggi" }} />
        <Tab.Screen name="Log" component={LogEntryScreen} options={{ title: "Registra" }} />
        <Tab.Screen name="Workout" component={WorkoutScreen} options={{ title: "Allenamento" }} />
        <Tab.Screen name="Diet" component={DietScreen} options={{ title: "Dieta" }} />
        <Tab.Screen name="More" component={MoreStack} options={{ title: "Altro" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
