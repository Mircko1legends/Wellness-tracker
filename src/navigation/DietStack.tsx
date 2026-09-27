import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { DietScreen } from "../screens/DietScreen";
import { MealsScreen } from "../screens/MealsScreen";
import { RecipesScreen } from "../screens/RecipesScreen";

export type DietStackParamList = {
  Meals: undefined;
  DietGuide: undefined;
  Recipes: undefined;
};

const Stack = createNativeStackNavigator<DietStackParamList>();

export function DietStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Meals" component={MealsScreen} />
      <Stack.Screen name="DietGuide" component={DietScreen} />
      <Stack.Screen name="Recipes" component={RecipesScreen} />
    </Stack.Navigator>
  );
}
