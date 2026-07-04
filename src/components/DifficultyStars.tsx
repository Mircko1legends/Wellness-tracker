import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { colors } from "../theme";

export function DifficultyStars({ difficulty, size = 12 }: { difficulty: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3].map((n) => (
        <Ionicons
          key={n}
          name={n <= difficulty ? "star" : "star-outline"}
          size={size}
          color={n <= difficulty ? colors.accent : colors.border}
        />
      ))}
    </View>
  );
}
