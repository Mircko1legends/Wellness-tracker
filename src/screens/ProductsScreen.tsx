import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, spacing } from "../theme";

export function ProductsScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Prodotti"
        subtitle="Skincare, hair care e integratori per budget"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <Text style={styles.placeholder}>In arrivo</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md },
  placeholder: { color: colors.textMuted },
});
