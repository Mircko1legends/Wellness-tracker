import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ExerciseVideoScreen } from "../screens/ExerciseVideoScreen";
import { GymScreen } from "../screens/GymScreen";

export type WorkoutStackParamList = {
  Gym: undefined;
  ExerciseVideo: { exerciseId: string; name: string; query: string };
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export function WorkoutStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Gym" component={GymScreen} />
      <Stack.Screen name="ExerciseVideo" component={ExerciseVideoScreen} />
    </Stack.Navigator>
  );
}
