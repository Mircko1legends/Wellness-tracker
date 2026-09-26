import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { ScreenHeader } from "../components/ScreenHeader";
import { youtubeEmbedUrl, youtubeId, youtubeSearchUrl } from "../gym/gym";
import type { WorkoutStackParamList } from "../navigation/WorkoutStack";
import { loadGymVideos, saveGymVideos } from "../storage/storage";
import { colors, radii, spacing } from "../theme";

type Props = NativeStackScreenProps<WorkoutStackParamList, "ExerciseVideo">;

/**
 * Technique video inside the app, in an incognito WebView (no cookies, history or account kept).
 * A saved video plays through YouTube's official embeddable player (privacy-enhanced domain).
 */
export function ExerciseVideoScreen({ navigation, route }: Props) {
  const { exerciseId, name, query } = route.params;
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const [browsing, setBrowsing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    loadGymVideos().then((v) => setSaved(v[exerciseId] ?? null));
  }, [exerciseId]);

  const save = async (id: string | null) => {
    const all = await loadGymVideos();
    if (id) all[exerciseId] = id;
    else delete all[exerciseId];
    await saveGymVideos(all);
    setSaved(id);
    setBrowsing(false);
  };

  if (saved === undefined) return <View style={styles.container} />;
  const uri = saved && !browsing ? youtubeEmbedUrl(saved) : youtubeSearchUrl(query);

  return (
    <View style={styles.container}>
      <ScreenHeader eyebrow="Tecnica · navigazione in incognito" title={name} onBack={() => navigation.goBack()} />
      <View style={styles.bar}>
        {saved && !browsing ? (
          <>
            <Text style={styles.hint}>Il tuo video salvato per questo esercizio.</Text>
            <TouchableOpacity onPress={() => setBrowsing(true)}>
              <Text style={styles.link}>Cerca un altro video</Text>
            </TouchableOpacity>
          </>
        ) : currentId && currentId !== saved ? (
          <TouchableOpacity style={styles.button} onPress={() => save(currentId)}>
            <Text style={styles.buttonText}>Salva questo video per l'esercizio</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>Scegli un video: se ti convince, salvalo e la prossima volta si apre subito.</Text>
        )}
      </View>
      <WebView
        key={uri}
        source={{ uri }}
        incognito
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onNavigationStateChange={(state) => setCurrentId(youtubeId(state.url))}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bar: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 4 },
  hint: { fontSize: 12, color: colors.textMuted },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 13 },
  web: { flex: 1, backgroundColor: colors.background },
});
