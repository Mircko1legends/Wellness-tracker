import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { DayScreen } from "../screens/DayScreen";
import { ImportScreen } from "../screens/ImportScreen";

export type DayStackParamList = {
  Day: undefined;
  Import: { kind: "routine" | "diet" };
};

const Stack = createNativeStackNavigator<DayStackParamList>();

export function DayStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Day" component={DayScreen} />
      <Stack.Screen name="Import" component={ImportScreen} />
    </Stack.Navigator>
  );
}
