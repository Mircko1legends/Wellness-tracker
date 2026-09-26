import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { DietScreen } from "../screens/DietScreen";
import { MealsScreen } from "../screens/MealsScreen";

export type DietStackParamList = {
  Meals: undefined;
  DietGuide: undefined;
};

const Stack = createNativeStackNavigator<DietStackParamList>();

export function DietStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Meals" component={MealsScreen} />
      <Stack.Screen name="DietGuide" component={DietScreen} />
    </Stack.Navigator>
  );
}
