import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { takeSnapshot } from "../backup/backup";
import { todayKey } from "../utils/date";
import {
  computeXp,
  dayGoals,
  levelFor,
  missionsFor,
  ProgressData,
  progressDataFromSnapshot,
  streaks,
  trainingMinutes,
  weekTraining,
} from "./lifeProgress";

/**
 * XP, level, streak, training hours and missions, recomputed from everything stored whenever a screen
 * that uses them comes into view (and every 15 seconds while it stays open).
 */
export function useLifeProgress() {
  const [data, setData] = useState<ProgressData | null>(null);

  const refresh = useCallback(async () => {
    setData(progressDataFromSnapshot(await takeSnapshot()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
      const timer = setInterval(() => refresh().catch(() => {}), 15_000);
      return () => clearInterval(timer);
    }, [refresh])
  );

  return useMemo(() => {
    if (!data) return null;
    const today = todayKey();
    const xp = computeXp(data, today);
    return {
      data,
      today,
      xp,
      level: levelFor(xp.total),
      streak: streaks(data, today),
      week: weekTraining(data, today),
      trainingToday: trainingMinutes(data.plan, data.timelineLog, today),
      goalsToday: dayGoals(data, today),
      missions: missionsFor(data, today),
      refresh,
    };
  }, [data, refresh]);
}
