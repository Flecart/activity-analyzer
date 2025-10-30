import Papa from "papaparse";

export type CsvRow = {
  "activity name": string;
  "time started": string;
  "time ended": string;
  comment?: string;
  categories?: string;
  "record tags"?: string;
  duration?: string;
  "duration minutes"?: string | number;
};

export type RecordItem = {
  activity: string;
  start: Date;
  end: Date;
  minutes: number;
  categories: string[];
  tags: string[];
  rowIndex: number;
};

export async function parseCsvFile(file: File): Promise<RecordItem[]> {
  const text = await file.text();
  return parseCsvText(text);
}

export function parseCsvText(text: string): RecordItem[] {
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  const items: RecordItem[] = [];
  parsed.data.forEach((row, idx) => {
    const activity = (row["activity name"] || "").trim();
    if (!activity) return;
    const startStr = (row["time started"] || "").trim();
    const endStr = (row["time ended"] || "").trim();
    if (!startStr || !endStr) return;
    const start = new Date(startStr.replace(" ", "T") + "+00:00");
    const end = new Date(endStr.replace(" ", "T") + "+00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    const minutesRaw = (row["duration minutes"] ?? "").toString().trim();
    const minutes = minutesRaw ? Number(minutesRaw) : Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    const categories = (row.categories || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const tags = (row["record tags"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    items.push({ activity, start, end, minutes, categories, tags, rowIndex: idx });
  });
  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}


