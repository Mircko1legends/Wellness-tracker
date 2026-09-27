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

/** Keeps "done" marks when a new version of the goals is imported (matched by id, or by the same milestone text). */
export function mergeGoals(existing: LifeGoal[], incoming: LifeGoal[]): LifeGoal[] {
  const doneByTitle = new Map<string, number | undefined>();
  const doneById = new Map<string, { title: string; doneAt?: number }>();
  for (const g of existing) {
    for (const m of g.milestones) {
      if (!m.done) continue;
      doneByTitle.set(m.title.trim().toLowerCase(), m.doneAt);
      doneById.set(m.id, { title: m.title, doneAt: m.doneAt });
    }
  }
  return incoming.map((goal) => ({
    ...goal,
    milestones: goal.milestones.map((m) => {
      const key = m.title.trim().toLowerCase();
      if (doneByTitle.has(key)) return { ...m, done: true, doneAt: doneByTitle.get(key) };
      const sameId = doneById.get(m.id);
      // Same id but the text changed a lot: it's a different milestone now, so it starts undone.
      return sameId && sameId.title.slice(0, 12).toLowerCase() === m.title.slice(0, 12).toLowerCase()
        ? { ...m, done: true, doneAt: sameId.doneAt }
        : m;
    }),
  }));
}
