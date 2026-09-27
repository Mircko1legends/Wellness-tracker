import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import {
  AVOID,
  monthlyCost,
  MOOD_TRUTH,
  MY_SUPPLEMENTS,
  SKINCARE,
  SKINCARE_RULES,
  SUGGESTED_SUPPLEMENTS,
  Supplement,
} from "../data/careProducts";
import { colors, radii, spacing } from "../theme";

const APPROVED_KEY = "@wellness/supplementsApproved";

const EVIDENCE_COLOR: Record<string, string> = { buona: "#3FD97F", discreta: "#E3E36A", scarsa: "#FF9F43", "molto scarsa": "#FF453A" };

function formatDate(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function SupplementRow({ s, approved, onToggle }: { s: Supplement; approved: boolean; onToggle: () => void }) {
  return (
    <View style={styles.supp}>
      <View style={styles.suppHead}>
        <Text style={styles.suppName}>{s.name}</Text>
        <Text style={styles.cost}>
          {s.costMin}–{s.costMax} €/mese
        </Text>
      </View>
      <Text style={styles.body}>{s.why}</Text>
      <Text style={[styles.evidence, { color: EVIDENCE_COLOR[s.evidence] }]}>Prove scientifiche: {s.evidence}</Text>
      <Text style={styles.caution}>{s.caution}</Text>
      <View style={styles.approveRow}>
        <Text style={styles.hint}>Approvato dallo psichiatra</Text>
        <Switch value={approved} onValueChange={onToggle} trackColor={{ true: colors.success, false: colors.border }} />
      </View>
    </View>
  );
}

export function ProductsScreen() {
  const navigation = useNavigation();
  const [approved, setApproved] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(APPROVED_KEY)
      .then((raw) => raw && setApproved(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const toggle = (id: string) => {
    const next = approved.includes(id) ? approved.filter((x) => x !== id) : [...approved, id];
    setApproved(next);
    AsyncStorage.setItem(APPROVED_KEY, JSON.stringify(next)).catch(() => {});
  };

  const mine = monthlyCost(MY_SUPPLEMENTS);
  const all = monthlyCost([...MY_SUPPLEMENTS, ...SUGGESTED_SUPPLEMENTS]);
  const chosen = monthlyCost([...MY_SUPPLEMENTS, ...SUGGESTED_SUPPLEMENTS].filter((s) => approved.includes(s.id)));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Skincare e integratori" subtitle="I tuoi prodotti, i costi e cosa chiedere al medico" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>La tua skincare</Text>
        {SKINCARE.map((p) => (
          <View key={p.name} style={styles.card}>
            <Text style={styles.suppName}>{p.name}</Text>
            <Text style={styles.body}>
              {p.role} · {p.when}
            </Text>
            <Text style={styles.hint}>{p.how}</Text>
            <Text style={styles.from}>Nel piano dal {formatDate(p.from)}</Text>
          </View>
        ))}
        <View style={styles.card}>
          {SKINCARE_RULES.map((r) => (
            <Text key={r} style={styles.body}>
              • {r}
            </Text>
          ))}
        </View>

        <Text style={styles.section}>Integratori: da decidere con lo psichiatra</Text>
        <View style={[styles.card, styles.truth]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.body, { flex: 1 }]}>{MOOD_TRUTH}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.total}>I tuoi 8 preferiti: circa {mine.min}–{mine.max} € al mese</Text>
          <Text style={styles.total}>Con i 4 consigliati: circa {all.min}–{all.max} € al mese</Text>
          <Text style={styles.total}>
            Solo quelli approvati: {chosen.max ? `${chosen.min}–${chosen.max} € al mese` : "nessuno ancora"}
          </Text>
          <Text style={styles.hint}>Stime per marche di fascia media alla dose di etichetta; nessuna dose qui è un consiglio medico.</Text>
        </View>

        <Text style={styles.subsection}>I tuoi preferiti</Text>
        {MY_SUPPLEMENTS.map((s) => (
          <SupplementRow key={s.id} s={s} approved={approved.includes(s.id)} onToggle={() => toggle(s.id)} />
        ))}

        <Text style={styles.subsection}>Da proporre allo psichiatra</Text>
        {SUGGESTED_SUPPLEMENTS.map((s) => (
          <SupplementRow key={s.id} s={s} approved={approved.includes(s.id)} onToggle={() => toggle(s.id)} />
        ))}

        <Text style={styles.subsection}>Meglio evitare (disturbo dell'umore + litio)</Text>
        <View style={styles.card}>
          {AVOID.map((a) => (
            <Text key={a} style={styles.body}>
              • {a}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { fontSize: 16, fontWeight: "900", color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  subsection: { fontSize: 13, fontWeight: "800", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: 6 },
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 4 },
  truth: { flexDirection: "row", gap: spacing.sm, borderColor: colors.primary },
  supp: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, gap: 4 },
  suppHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  suppName: { color: colors.text, fontWeight: "800", fontSize: 14, flex: 1 },
  cost: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  body: { color: colors.text, fontSize: 13, lineHeight: 19 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  evidence: { fontSize: 12, fontWeight: "700" },
  caution: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  from: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  total: { color: colors.text, fontSize: 13, fontWeight: "700" },
  approveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
});
