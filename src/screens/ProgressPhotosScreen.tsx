import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import type { MoreStackParamList } from "../navigation/MoreStack";
import {
  daysSinceLast,
  deleteProgressPhoto,
  isProgressPhotoSupported,
  PHOTO_TIPS,
  PhotoKind,
  ProgressPhoto,
  storeProgressPhoto,
} from "../progress/photos";
import { loadProgressPhotos, saveProgressPhotos } from "../storage/storage";
import { colors, radii, spacing } from "../theme";
import { formatShortLabel, todayKey } from "../utils/date";

type Props = NativeStackScreenProps<MoreStackParamList, "ProgressPhotos">;

function Photo({ photo, style }: { photo: ProgressPhoto; style: object }) {
  const [src, setSrc] = useState(photo.uri);
  return <Image source={{ uri: src }} style={style} onError={() => photo.backupUri && src !== photo.backupUri && setSrc(photo.backupUri)} />;
}

export function ProgressPhotosScreen({ navigation }: Props) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [kind, setKind] = useState<PhotoKind>("viso");
  const [message, setMessage] = useState("");
  const today = todayKey();

  useEffect(() => {
    loadProgressPhotos().then(setPhotos);
  }, []);

  const persist = async (next: ProgressPhoto[]) => {
    setPhotos(next);
    await saveProgressPhotos(next);
  };

  const take = async (camera: boolean) => {
    setMessage("");
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
      setMessage("Serve il permesso per la fotocamera.");
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { quality: 0.7, mediaTypes: ["images"] };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    try {
      const photo = await storeProgressPhoto(result.assets[0].uri, kind, today);
      await persist([...photos, photo]);
      setMessage(photo.backupUri ? "Salvata anche nella cartella di backup." : "Salvata. Imposta la cartella di backup per non perderla disinstallando l'app.");
    } catch {
      setMessage("Non sono riuscito a salvare la foto.");
    }
  };

  const list = photos.filter((p) => p.kind === kind).sort((a, b) => a.date.localeCompare(b.date));
  const first = list[0];
  const last = list[list.length - 1];
  const since = daysSinceLast(photos, kind, today);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Foto progressi" subtitle="Private: restano sul telefono" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          {(["viso", "fisico"] as PhotoKind[]).map((k) => (
            <TouchableOpacity key={k} style={[styles.tab, kind === k && styles.tabOn]} onPress={() => setKind(k)}>
              <Text style={[styles.tabText, kind === k && styles.tabTextOn]}>{k === "viso" ? "Viso e pelle" : "Fisico"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {!isProgressPhotoSupported ? (
          <Text style={styles.hint}>Le foto dei progressi funzionano nell'app Android.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.hint}>{PHOTO_TIPS[kind]}</Text>
            <Text style={[styles.hint, { marginTop: 4 }]}>
              Una volta al mese basta: i cambiamenti di pelle e fisico si vedono sulle settimane, non sui giorni.
              {since !== null ? ` Ultima foto: ${since === 0 ? "oggi" : `${since} giorni fa`}.` : ""}
            </Text>
            <View style={[styles.row, { marginTop: spacing.sm }]}>
              <PressableScale style={[styles.button, { flex: 1 }]} onPress={() => take(true)}>
                <Text style={styles.buttonText}>Scatta</Text>
              </PressableScale>
              <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => take(false)}>
                <Text style={styles.ghostText}>Dalla galleria</Text>
              </PressableScale>
            </View>
            {message ? <Text style={[styles.hint, { marginTop: 6 }]}>{message}</Text> : null}
          </View>
        )}

        {first && last && first.id !== last.id && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prima e adesso</Text>
            <View style={styles.row}>
              {[first, last].map((p) => (
                <View key={p.id} style={{ flex: 1 }}>
                  <Photo photo={p} style={styles.compare} />
                  <Text style={styles.caption}>{formatShortLabel(p.date)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.grid}>
          {[...list].reverse().map((p) => (
            <View key={p.id} style={styles.thumbWrap}>
              <Photo photo={p} style={styles.thumb} />
              <View style={styles.thumbBar}>
                <Text style={styles.caption}>{formatShortLabel(p.date)}</Text>
                <TouchableOpacity accessibilityLabel="Elimina foto" onPress={() => deleteProgressPhoto(p).then(() => persist(photos.filter((x) => x.id !== p.id)))}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: "700" },
  tabTextOn: { color: colors.onPrimary },
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 13 },
  ghost: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, alignItems: "center" },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  compare: { width: "100%", aspectRatio: 3 / 4, borderRadius: radii.md, backgroundColor: colors.cardAlt },
  caption: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumbWrap: { width: "31%" },
  thumb: { width: "100%", aspectRatio: 3 / 4, borderRadius: radii.sm, backgroundColor: colors.cardAlt },
  thumbBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
