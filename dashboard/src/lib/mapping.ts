export type CoarseType = "Sleep" | "Work" | "PauseBetweenWork" | "Chores" | "Leisure" | "Uncategorized";

export const coarseTypes: CoarseType[] = ["Sleep", "Work", "PauseBetweenWork", "Chores", "Leisure", "Uncategorized"];

export const specialRules = {
  realpausa_inherit_between_work: true,
};

export const activityToCoarse: Record<string, CoarseType> = {
  // Core
  Sleep: "Sleep",
  Cooking: "Chores",
  Cure: "Chores",
  svago: "Leisure",
  pause: "Leisure",
  People: "Leisure",

  // Work and courses
  PAI: "Work",
  AML: "Work",
  esplorazioni: "Work",
  chores: "Work", // admin work
  Sides: "Work",
  Marro: "Work",
  Zhijing: "Work",
  NLP: "Work",
  DJ: "Work",
  Moor: "Work",

  // Courses counted as Work
  "Big Data": "Work",
  "Neural Sytems": "Work",
  Robots: "Work",
  Cloud: "Work",
  ASL: "Work",
  perception: "Work",
  finance: "Work",
  Large: "Work",
  Psycho: "Work",
  Object: "Work",
  Algolab: "Leisure",

  // Home chores
  Casa: "Chores",

  // Health/fitness
  Exercise: "Chores",

  // realpausa: always PauseBetweenWork (for display purposes)
  realpausa: "PauseBetweenWork",
};

export const categoryToCoarse: Record<string, CoarseType> = {
  course: "Work",
  work: "Work",
  svago: "Leisure",
  studio: "Work",
  Religion: "Chores",
};


