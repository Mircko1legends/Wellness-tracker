import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { GymScreen } from "../screens/GymScreen";
import { WorkoutScreen } from "../screens/WorkoutScreen";

export type WorkoutStackParamList = {
  Gym: undefined;
  Bodyweight: undefined;
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export function WorkoutStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Gym" component={GymScreen} />
      <Stack.Screen name="Bodyweight" component={WorkoutScreen} />
    </Stack.Navigator>
  );
}
