import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGoals } from "../context/GoalsContext";
import { useTimeline } from "../context/TimelineContext";
import { askFinanceAdviser, FinanceAdvice } from "../finance/adviser";
import { AiReadError } from "../import/gemini";
import { useLifeProgress } from "../progress/useLifeProgress";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { loadFinance, saveFinance } from "../storage/storage";
import { colors, radii, spacing } from "../theme";
import {
  addMonths,
  changeRecurringAmount,
  declareLeftover,
  endRecurring,
  FinanceData,
  flowsForMonth,
  formatEuro,
  formatMonth,
  MonthKey,
  monthKeyOf,
  parseQuickEntry,
  pendingLeftoverMonth,
  RecurringFlow,
  removeLeftoverDeclaration,
  summarizeMonth,
} from "../utils/finance";

const PROJECTION_MONTHS = 12;

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function parseAmount(text: string): number | null {
  const value = Number(text.replace(",", ".").replace("€", "").trim());
  return Number.isFinite(value) && value >= 0 && text.trim() !== "" ? value : null;
}

function signed(kind: "income" | "expense", amount: number): string {
  return `${kind === "income" ? "+" : "-"}${formatEuro(amount)}`;
}

export function FinanceScreen() {
  const navigation = useNavigation();
  const currentMonth = monthKeyOf(new Date());
  const [data, setData] = useState<FinanceData | null>(null);
  const [month, setMonth] = useState<MonthKey>(currentMonth);

  useEffect(() => {
    loadFinance().then(setData);
  }, []);

  if (!data) return <View style={styles.container} />;

  const update = (next: FinanceData) => {
    setData(next);
    saveFinance(next);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Finanza" subtitle="Entrate, spese fisse e una tantum" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LeftoverPrompt data={data} currentMonth={currentMonth} onChange={update} />
        <AdviserCard data={data} currentMonth={currentMonth} />

        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonth(addMonths(month, -1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.monthLabel}>{capitalize(formatMonth(month))}</Text>
            {month !== currentMonth && (
              <TouchableOpacity onPress={() => setMonth(currentMonth)}>
                <Text style={styles.backToToday}>torna al mese corrente</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => setMonth(addMonths(month, 1))} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <MonthSummaryCard key={month} data={data} month={month} currentMonth={currentMonth} onChange={update} />
        <QuickAdd month={month} data={data} onChange={update} />
        <MonthFlows data={data} month={month} onChange={update} />
        <Projection data={data} currentMonth={currentMonth} onSelect={setMonth} />
      </ScrollView>
    </View>
  );
}

function LeftoverPrompt({
  data,
  currentMonth,
  onChange,
}: {
  data: FinanceData;
  currentMonth: MonthKey;
  onChange: (d: FinanceData) => void;
}) {
  const [amount, setAmount] = useState("");
  const pending = pendingLeftoverMonth(data, currentMonth);
  if (!pending) return null;
  const parsed = parseAmount(amount);

  return (
    <View style={[styles.card, styles.promptCard]}>
      <Text style={styles.cardTitle}>{capitalize(formatMonth(pending))} è finito</Text>
      <Text style={styles.hint}>
        Ti sono avanzati dei soldi? Se non lo indichi, quello che restava viene contato come speso in altro.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Quanto ti è avanzato (es. 120)"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <View style={styles.row}>
        <PressableScale
          style={[styles.button, { flex: 1 }, parsed === null && styles.disabled]}
          onPress={() => parsed !== null && onChange(declareLeftover(data, pending, parsed))}
        >
          <Text style={styles.buttonText}>Registra avanzo</Text>
        </PressableScale>
        <PressableScale style={[styles.buttonGhost, { flex: 1 }]} onPress={() => onChange(declareLeftover(data, pending, 0))}>
          <Text style={styles.buttonGhostText}>Non è avanzato nulla</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function MonthSummaryCard({
  data,
  month,
  currentMonth,
  onChange,
}: {
  data: FinanceData;
  month: MonthKey;
  currentMonth: MonthKey;
  onChange: (d: FinanceData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const s = summarizeMonth(data, month, currentMonth);
  const parsed = parseAmount(amount);

  const bigLabel =
    s.status === "current" ? "Ti restano" : s.status === "future" ? "Previsto a fine mese" : "Disponibile nel mese";

  return (
    <View style={styles.card}>
      {s.carriedIn > 0 && (
        <SummaryRow
          label={`Avanzo da ${formatMonth(addMonths(month, -1))}`}
          value={`+${formatEuro(s.carriedIn)}`}
          color={colors.success}
        />
      )}
      <SummaryRow label="Entrate" value={`+${formatEuro(s.income)}`} color={colors.success} />
      <SummaryRow label="Uscite" value={`-${formatEuro(s.expenses)}`} color={colors.danger} />
      <View style={styles.divider} />
      <Text style={styles.bigLabel}>{bigLabel}</Text>
      <Text style={[styles.bigValue, s.available < 0 && { color: colors.danger }]}>{formatEuro(s.available)}</Text>
      {s.status === "future" && (
        <Text style={styles.hint}>I soldi avanzati si riportano solo quando li dichiari, quindi qui non sono inclusi.</Text>
      )}

      {s.status === "past" && (
        <>
          <View style={styles.divider} />
          <SummaryRow
            label="Avanzato (dichiarato)"
            value={s.declaredLeftover === null ? "non dichiarato" : formatEuro(s.declaredLeftover)}
          />
          {s.unaccounted !== null && s.unaccounted !== 0 && (
            <SummaryRow
              label={s.unaccounted > 0 ? "Speso in altro" : "Entrate non registrate"}
              value={formatEuro(Math.abs(s.unaccounted))}
              color={colors.textMuted}
            />
          )}
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.link}>{s.declaredLeftover === null ? "Dichiara quanto è avanzato" : "Modifica avanzo"}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              <TextInput
                style={styles.input}
                placeholder="Quanto è avanzato"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
              <View style={styles.row}>
                <PressableScale
                  style={[styles.button, { flex: 1 }, parsed === null && styles.disabled]}
                  onPress={() => {
                    if (parsed === null) return;
                    onChange(declareLeftover(data, month, parsed));
                    setEditing(false);
                    setAmount("");
                  }}
                >
                  <Text style={styles.buttonText}>Salva</Text>
                </PressableScale>
                {s.declaredLeftover !== null && (
                  <PressableScale
                    style={[styles.buttonGhost, { flex: 1 }]}
                    onPress={() => {
                      onChange(removeLeftoverDeclaration(data, month));
                      setEditing(false);
                    }}
                  >
                    <Text style={styles.buttonGhostText}>Togli dichiarazione</Text>
                  </PressableScale>
                )}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function QuickAdd({ month, data, onChange }: { month: MonthKey; data: FinanceData; onChange: (d: FinanceData) => void }) {
  const [text, setText] = useState("");
  const [recurring, setRecurring] = useState(true);
  const entry = parseQuickEntry(text);

  const add = () => {
    if (!entry) return;
    if (recurring) {
      onChange({ ...data, recurring: [...data.recurring, { id: generateId(), ...entry, startMonth: month }] });
    } else {
      onChange({ ...data, oneOffs: [...data.oneOffs, { id: generateId(), ...entry, month }] });
    }
    setText("");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Aggiungi</Text>
      <View style={[styles.row, { marginBottom: spacing.sm }]}>
        {[true, false].map((value) => (
          <TouchableOpacity
            key={String(value)}
            style={[styles.segment, recurring === value && styles.segmentActive]}
            onPress={() => setRecurring(value)}
          >
            <Text style={[styles.segmentText, recurring === value && styles.segmentTextActive]}>
              {value ? `Ogni mese, da ${formatMonth(month)}` : `Solo ${formatMonth(month)}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="es. -50 internet  ·  +1200 stipendio"
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        onSubmitEditing={add}
        returnKeyType="done"
      />
      <Text style={styles.hint}>
        {entry
          ? `${entry.kind === "income" ? "Entrata" : "Uscita"} · ${formatEuro(entry.amount)} · ${entry.label}`
          : "Il segno − è una spesa, il + un'entrata. Senza segno conta come spesa."}
      </Text>
      <PressableScale style={[styles.button, !entry && styles.disabled]} onPress={add}>
        <Text style={styles.buttonText}>Aggiungi</Text>
      </PressableScale>
    </View>
  );
}

function RecurringRow({
  flow,
  month,
  data,
  onChange,
}: {
  flow: RecurringFlow;
  month: MonthKey;
  data: FinanceData;
  onChange: (d: FinanceData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const parsed = parseAmount(amount);

  return (
    <View style={styles.flowRow}>
      <TouchableOpacity style={styles.flowMain} onPress={() => setOpen(!open)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.flowLabel}>{flow.label}</Text>
          <Text style={styles.flowMeta}>
            da {formatMonth(flow.startMonth)}
            {flow.endMonth ? ` · fino a ${formatMonth(flow.endMonth)}` : ""}
          </Text>
        </View>
        <Text style={[styles.flowAmount, { color: flow.kind === "income" ? colors.success : colors.danger }]}>
          {signed(flow.kind, flow.amount)}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.flowActions}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Nuovo importo"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
            <PressableScale
              style={[styles.buttonSmall, parsed === null && styles.disabled]}
              onPress={() => {
                if (parsed === null) return;
                onChange(changeRecurringAmount(data, flow.id, parsed, month, generateId()));
                setAmount("");
                setOpen(false);
              }}
            >
              <Text style={styles.buttonText}>Cambia da {formatMonth(month)}</Text>
            </PressableScale>
          </View>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <PressableScale style={[styles.buttonGhost, { flex: 1 }]} onPress={() => onChange(endRecurring(data, flow.id, month))}>
              <Text style={styles.buttonGhostText}>Ultimo mese: {formatMonth(month)}</Text>
            </PressableScale>
            <PressableScale
              style={[styles.buttonGhost, { flex: 1, borderColor: colors.danger }]}
              onPress={() => onChange({ ...data, recurring: data.recurring.filter((f) => f.id !== flow.id) })}
            >
              <Text style={[styles.buttonGhostText, { color: colors.danger }]}>Elimina (anche dal passato)</Text>
            </PressableScale>
          </View>
        </View>
      )}
    </View>
  );
}

function MonthFlows({ data, month, onChange }: { data: FinanceData; month: MonthKey; onChange: (d: FinanceData) => void }) {
  const { recurring, oneOffs } = flowsForMonth(data, month);

  return (
    <>
      <Text style={styles.sectionTitle}>Fisse ogni mese</Text>
      {recurring.length === 0 && <Text style={styles.empty}>Nessuna entrata o spesa fissa attiva in questo mese.</Text>}
      {recurring.map((flow) => (
        <RecurringRow key={flow.id} flow={flow} month={month} data={data} onChange={onChange} />
      ))}

      <Text style={styles.sectionTitle}>Una tantum di {formatMonth(month)}</Text>
      {oneOffs.length === 0 && <Text style={styles.empty}>Nessuna voce una tantum in questo mese.</Text>}
      {oneOffs.map((flow) => (
        <View key={flow.id} style={[styles.flowRow, styles.flowMain]}>
          <Text style={[styles.flowLabel, { flex: 1 }]}>{flow.label}</Text>
          <Text style={[styles.flowAmount, { color: flow.kind === "income" ? colors.success : colors.danger }]}>
            {signed(flow.kind, flow.amount)}
          </Text>
          <TouchableOpacity
            onPress={() => onChange({ ...data, oneOffs: data.oneOffs.filter((f) => f.id !== flow.id) })}
            hitSlop={8}
            style={{ marginLeft: spacing.sm }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ))}
    </>
  );
}

function Projection({
  data,
  currentMonth,
  onSelect,
}: {
  data: FinanceData;
  currentMonth: MonthKey;
  onSelect: (m: MonthKey) => void;
}) {
  const months = useMemo(
    () => Array.from({ length: PROJECTION_MONTHS }, (_, i) => summarizeMonth(data, addMonths(currentMonth, i), currentMonth)),
    [data, currentMonth]
  );
  if (data.recurring.length === 0 && data.oneOffs.length === 0) return null;

  return (
    <>
      <Text style={styles.sectionTitle}>Prossimi {PROJECTION_MONTHS} mesi</Text>
      <View style={styles.card}>
        {months.map((s) => {
          const net = s.income - s.expenses;
          return (
            <TouchableOpacity key={s.month} style={styles.summaryRow} onPress={() => onSelect(s.month)}>
              <Text style={styles.summaryLabel}>{capitalize(formatMonth(s.month))}</Text>
              <Text style={[styles.summaryValue, { color: net < 0 ? colors.danger : colors.text }]}>
                {net >= 0 ? "+" : ""}
                {formatEuro(net)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Text style={styles.hint}>Entrate meno uscite registrate per ogni mese, senza avanzi riportati.</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  adviserCard: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.primary, padding: spacing.md, marginBottom: spacing.md },
  adviserTitle: { color: colors.text, fontWeight: "800", fontSize: 15, flex: 1 },
  adviserHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  adviserInput: { backgroundColor: colors.cardAlt, color: colors.text, borderRadius: radii.sm, padding: spacing.sm, minHeight: 64, marginTop: spacing.sm, textAlignVertical: "top" },
  adviserButton: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  adviserButtonText: { color: colors.onPrimary, fontWeight: "800" },
  adviceSummary: { color: colors.text, fontSize: 13, lineHeight: 19 },
  adviceTitle: { fontWeight: "800", fontSize: 13, color: colors.text, marginBottom: 2 },
  adviceRow: { marginBottom: 6 },
  adviceItem: { color: colors.text, fontSize: 13, fontWeight: "600" },
  adviceWhy: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  promptCard: { borderColor: colors.primary },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.xs },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  buttonSmall: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 13 },
  buttonGhost: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
  },
  buttonGhostText: { color: colors.text, fontWeight: "600", fontSize: 12, textAlign: "center" },
  disabled: { opacity: 0.4 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  monthLabel: { fontSize: 18, fontWeight: "800", color: colors.text },
  backToToday: { fontSize: 11, color: colors.primary, marginTop: 2 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  summaryLabel: { fontSize: 13, color: colors.textMuted },
  summaryValue: { fontSize: 13, fontWeight: "700", color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  bigLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bigValue: { fontSize: 28, fontWeight: "800", color: colors.primary, marginVertical: 2 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: spacing.sm },
  segment: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: colors.cardAlt, borderColor: colors.primary },
  segmentText: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  segmentTextActive: { color: colors.text, fontWeight: "700" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  empty: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  flowRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  flowMain: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  flowLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  flowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  flowAmount: { fontSize: 14, fontWeight: "800" },
  flowActions: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});

const ADVICE_KEY = "@wellness/financeAdvice";

function AdviceList({ title, color, items }: { title: string; color: string; items: { item: string; price: number | null; why: string; when?: string; impact?: string }[] }) {
  if (!items.length) return null;
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={[styles.adviceTitle, { color }]}>{title}</Text>
      {items.map((i, n) => (
        <View key={n} style={styles.adviceRow}>
          <Text style={styles.adviceItem}>
            {i.item}
            {i.price !== null ? ` · ${formatEuro(i.price)}` : ""}
            {i.impact ? ` · impatto ${i.impact}` : ""}
            {i.when ? ` · ${i.when}` : ""}
          </Text>
          {i.why ? <Text style={styles.adviceWhy}>{i.why}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Free AI adviser: what to buy next month, what to postpone, and what to do with money left over. */
function AdviserCard({ data, currentMonth }: { data: FinanceData; currentMonth: MonthKey }) {
  const { ai } = useTimeline();
  const { goals } = useGoals();
  const progress = useLifeProgress();
  const [wishes, setWishes] = useState("");
  const [advice, setAdvice] = useState<FinanceAdvice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(ADVICE_KEY)
      .then((raw) => raw && setAdvice(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const ask = async () => {
    setBusy(true);
    setError("");
    try {
      const notes = progress
        ? `Progressi: livello ${progress.level.level}/99, allenamento questa settimana ${progress.week.doneHours}/${progress.data.goals.trainingHoursWeek} h, serie di giorni con gli obiettivi raggiunti ${progress.streak.current}.`
        : "";
      const result = await askFinanceAdviser(data, goals, currentMonth, notes, wishes.trim(), ai);
      setAdvice(result);
      AsyncStorage.setItem(ADVICE_KEY, JSON.stringify(result)).catch(() => {});
    } catch (e) {
      setError(e instanceof AiReadError ? e.message : "Il consulente non ha risposto, riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.adviserCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        <Text style={styles.adviserTitle}>Consulente finanziario (IA gratuita)</Text>
      </View>
      <Text style={styles.adviserHint}>
        Scrivi cosa vorresti pagare o comprare il mese prossimo, con i prezzi se li sai. Ti dice cosa comprare subito, cosa
        rimandare, come risparmiare e, se avanzano soldi, cosa comprare in ordine di impatto sui tuoi obiettivi. Segue le
        regole di budget del tuo piano (fondo concorso e imprevisti non si toccano).
      </Text>
      <TextInput
        style={styles.adviserInput}
        value={wishes}
        onChangeText={setWishes}
        multiline
        placeholder="es. guantini MMA 35 €, libro per il TOLC 20 €, cuffie 60 €"
        placeholderTextColor={colors.textMuted}
      />
      {!ai.geminiApiKey ? (
        <Text style={styles.adviserHint}>Serve la chiave gratuita di Gemini: aggiungila in Giornata → Importa → IA.</Text>
      ) : (
        <PressableScale style={[styles.adviserButton, busy && { opacity: 0.6 }]} onPress={() => !busy && ask()}>
          <Text style={styles.adviserButtonText}>{busy ? "Sto pensando…" : "Chiedi al consulente"}</Text>
        </PressableScale>
      )}
      {error ? <Text style={[styles.adviserHint, { color: colors.danger }]}>{error}</Text> : null}
      {advice && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={styles.adviceSummary}>{advice.summary}</Text>
          {advice.available !== null && <Text style={styles.adviserHint}>Disponibile stimato il mese prossimo: {formatEuro(advice.available)}</Text>}
          <AdviceList title="Da comprare" color={colors.success} items={advice.mustBuy} />
          <AdviceList title="Da rimandare" color={colors.primary} items={advice.postpone} />
          <AdviceList title="Da evitare" color={colors.danger} items={advice.skip} />
          {advice.tips.length > 0 && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={styles.adviceTitle}>Consigli</Text>
              {advice.tips.map((t, i) => (
                <Text key={i} style={styles.adviceWhy}>
                  • {t}
                </Text>
              ))}
            </View>
          )}
          <AdviceList title="Se avanzano soldi: in ordine di impatto" color={colors.text} items={advice.ideas} />
          <Text style={[styles.adviserHint, { marginTop: spacing.sm }]}>
            Risposta di {advice.model || "Gemini"}: sono stime, la decisione è tua.
          </Text>
        </View>
      )}
    </View>
  );
}
