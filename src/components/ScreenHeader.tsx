import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "../theme";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  footer?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, right, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.backgroundElevated, colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {right}
      </View>
      {footer}
      <View style={styles.accentBar} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: "700",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  accentBar: {
    position: "absolute",
    bottom: -1,
    left: spacing.md,
    right: spacing.md,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
});
