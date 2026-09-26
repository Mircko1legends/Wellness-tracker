import React, { useRef } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function PressableScale({ onPress, style, children }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  // Sizing must live on the outer Pressable, or "flex: 1" buttons don't stretch in a row.
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = { flex: flat.flex, alignSelf: flat.alignSelf, width: flat.width };

  return (
    <Pressable style={outer} onPress={onPress} onPressIn={() => animateTo(0.96)} onPressOut={() => animateTo(1)}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
