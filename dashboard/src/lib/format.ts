export function formatMinutesAdaptive(minutes: number): string {
  if (minutes == null || isNaN(minutes)) return "-";
  if (minutes >= 1440) {
    const days = minutes / 1440;
    return `${days.toFixed(days >= 10 ? 0 : 1)} d`;
  }
  if (minutes >= 300) {
    const hours = minutes / 60;
    return `${hours.toFixed(hours >= 10 ? 0 : 1)} h`;
  }
  return `${Math.round(minutes)} min`;
}

export function percent(part: number, total: number): string {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}


