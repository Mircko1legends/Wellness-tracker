import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors, radii, spacing } from "../theme";
import { MoreStackParamList } from "../navigation/MoreStack";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreMenu">;

interface MenuItem {
  route: keyof MoreStackParamList;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
}

const ITEMS: MenuItem[] = [
  { route: "Medications", icon: "medkit-outline", title: "Farmaci", subtitle: "Promemoria e check giornaliero" },
  { route: "Products", icon: "sparkles-outline", title: "Prodotti", subtitle: "Skincare, hair care e integratori per budget" },
  { route: "Missions", icon: "trophy-outline", title: "Missioni", subtitle: "Livello, XP e abitudini sbloccate" },
  { route: "Goals", icon: "flag-outline", title: "Obiettivi", subtitle: "Traguardi giornalieri di sonno, acqua, attività" },
  { route: "History", icon: "stats-chart-outline", title: "Storico", subtitle: "Andamento e confronto settimanale" },
  { route: "Settings", icon: "settings-outline", title: "Impostazioni", subtitle: "Promemoria, esporta dati, reset" },
];

export function MoreMenuScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Altro" subtitle="Tutto il resto, in un posto solo" />
      <ScrollView contentContainerStyle={styles.content}>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.row}
            onPress={() => navigation.navigate(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.cardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
