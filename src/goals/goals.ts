export interface Milestone {
  id: string;
  title: string;
  due: string; // "YYYY-MM"
  done?: boolean;
  doneAt?: number;
}

export interface LifeGoal {
  id: string;
  title: string;
  priority: number; // 1 = most important
  target?: string; // what "done" means
  milestones: Milestone[];
}

export function sortGoals(goals: LifeGoal[]): LifeGoal[] {
  return [...goals].sort((a, b) => a.priority - b.priority);
}

export function goalProgress(goal: LifeGoal): { done: number; total: number; percent: number } {
  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** The earliest milestone not yet reached. */
export function nextMilestone(goal: LifeGoal): Milestone | null {
  return [...goal.milestones].filter((m) => !m.done).sort((a, b) => a.due.localeCompare(b.due))[0] ?? null;
}

export type MilestoneTiming = "past" | "now" | "future";

export function milestoneTiming(milestone: Milestone, currentMonth: string): MilestoneTiming {
  if (milestone.due < currentMonth) return "past";
  return milestone.due === currentMonth ? "now" : "future";
}

export function toggleMilestone(goals: LifeGoal[], goalId: string, milestoneId: string, now: number): LifeGoal[] {
  return goals.map((g) =>
    g.id !== goalId
      ? g
      : {
          ...g,
          milestones: g.milestones.map((m) =>
            m.id !== milestoneId ? m : m.done ? { ...m, done: false, doneAt: undefined } : { ...m, done: true, doneAt: now }
          ),
        }
  );
}

/** Keeps "done" marks when a new version of the same goals is imported. */
export function mergeGoals(existing: LifeGoal[], incoming: LifeGoal[]): LifeGoal[] {
  return incoming.map((goal) => {
    const old = existing.find((g) => g.id === goal.id);
    if (!old) return goal;
    return {
      ...goal,
      milestones: goal.milestones.map((m) => {
        const prev = old.milestones.find((p) => p.id === m.id);
        return prev?.done ? { ...m, done: true, doneAt: prev.doneAt } : m;
      }),
    };
  });
}
