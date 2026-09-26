import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect } from "react";
import { Linking, View } from "react-native";
import { youtubeSearchUrl } from "../gym/gym";
import type { WorkoutStackParamList } from "../navigation/WorkoutStack";
import { loadGymVideos } from "../storage/storage";
import { colors } from "../theme";

type Props = NativeStackScreenProps<WorkoutStackParamList, "ExerciseVideo">;

/** The browser has no incognito WebView: open YouTube in a new tab and come back. */
export function ExerciseVideoScreen({ navigation, route }: Props) {
  useEffect(() => {
    loadGymVideos().then((v) => {
      const id = v[route.params.exerciseId];
      Linking.openURL(id ? `https://www.youtube.com/watch?v=${id}` : youtubeSearchUrl(route.params.query));
      navigation.goBack();
    });
  }, [navigation, route.params]);
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
