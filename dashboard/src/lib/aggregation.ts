import { activityToCoarse, categoryToCoarse, CoarseType, coarseTypes } from "./mapping";
import type { RecordItem } from "./csv";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";

export type DecoratedItem = RecordItem & {
  coarse: CoarseType;
  inheritedFrom?: string | null; // For realpausa only: which activity is this pause inherited from
};

function classify(item: RecordItem): CoarseType {
  const byActivity = activityToCoarse[item.activity] as CoarseType | undefined;
  if (byActivity) return byActivity;
  for (const c of item.categories) {
    const mapped = categoryToCoarse[c];
    if (mapped) return mapped;
  }
  return "Uncategorized";
}

export function decorateWithCoarse(records: RecordItem[]): DecoratedItem[] {
  const base: DecoratedItem[] = records.map((r) => ({ ...r, coarse: classify(r), inheritedFrom: undefined }));

  for (let i = 0; i < base.length; i++) {
    const cur = base[i];
    if (cur.activity !== "realpausa") continue;
    // Look backwards for nearest non-realpausa record
    let prev: DecoratedItem | undefined = undefined;
    for (let j = i - 1; j >= 0; j--) {
      if (base[j].activity !== "realpausa") {
        prev = base[j];
        break;
      }
    }
    if (prev) {
      cur.coarse = prev.coarse;
      cur.inheritedFrom = prev.activity;
    } else {
      cur.coarse = "Uncategorized";
      cur.inheritedFrom = null;
    }
  }
  return base;
}

export type RangePreset = "1d" | "2d" | "3d" | "7d" | "30d" | "90d" | "all" | "custom";

export function filterByDateRange(records: DecoratedItem[], preset: RangePreset, custom?: { from: Date; to: Date }): DecoratedItem[] {
  if (preset === "all") return records;
  let from: Date;
  let to: Date = new Date();
  if (preset === "custom" && custom) {
    from = custom.from;
    to = custom.to;
  } else {
    // Preset logic for 1d, 2d, 3d, 7d, 30d, 90d
    const daysMap: Record<string, number> = { '1d': 1, '2d': 2, '3d': 3, '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[preset] ?? 7;
    from = addDays(to, -days);
  }
  return records.filter((r) => !isBefore(r.end, from) && !isAfter(r.start, to));
}

export type DayBucket = {
  day: string; // YYYY-MM-DD
  totals: Record<CoarseType, number>; // minutes per coarse type
};

export function bucketByDay(records: DecoratedItem[]): DayBucket[] {
  const byDay: Map<string, Record<CoarseType, number>> = new Map();
  for (const r of records) {
    const day = startOfDay(r.start).toISOString().slice(0, 10);
    if (!byDay.has(day)) {
      // Use all coarseTypes as keys (order matters not!)
      const obj: Record<CoarseType, number> = Object.fromEntries(coarseTypes.map((ct) => [ct, 0])) as Record<CoarseType, number>;
      byDay.set(day, obj);
    }
    const acc = byDay.get(day)!;
    acc[r.coarse] += r.minutes;
  }
  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, totals]) => ({ day, totals }));
}

export function sumTotals(records: DecoratedItem[]): Record<CoarseType, number> {
  const totals: Record<CoarseType, number> = Object.fromEntries(coarseTypes.map((ct) => [ct, 0])) as Record<CoarseType, number>;
  for (const r of records) totals[r.coarse] += r.minutes;
  return totals;
}

export function sumByActivityWithinCoarse(records: DecoratedItem[], coarse: CoarseType): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of records) {
    if (r.coarse !== coarse) continue;
    // For inherited pauses, group under inherited activity
    let act = r.activity;
    if (r.activity === "realpausa" && r.inheritedFrom) act = r.inheritedFrom;
    map[act] = (map[act] ?? 0) + r.minutes;
  }
  return map;
}

export function bucketByDayForCoarse(records: DecoratedItem[], coarse: CoarseType): { day: string; minutes: number }[] {
  const byDay: Map<string, number> = new Map();
  for (const r of records) {
    if (r.coarse !== coarse) continue;
    const day = startOfDay(r.start).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + r.minutes);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, minutes]) => ({ day, minutes }));
}


