"use client";
import { useEffect, useMemo, useState } from "react";
import { parseCsvText, parseCsvFile, type RecordItem } from "@/lib/csv";
import { decorateWithCoarse, bucketByDay, filterByDateRange, sumTotals, sumByActivityWithinCoarse, bucketByDayForCoarse, type RangePreset } from "@/lib/aggregation";
import { coarseTypes, type CoarseType } from "@/lib/mapping";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from "recharts";
import { formatMinutesAdaptive, percent } from "@/lib/format";

const COLORS: Record<CoarseType, string> = {
  Sleep: "#6b8e23",
  Work: "#2563eb",
  PauseBetweenWork: "#ffd600", // distinct yellow for inherited pause
  Chores: "#ea580c",
  Leisure: "#9333ea",
  Uncategorized: "#64748b",
};

export default function DashboardPage() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordItem[] | null>(null);
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CoarseType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Attempt to load default CSV from public path
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/data/stt_records_latest.csv", { cache: "no-store" });
        if (res.ok) {
          const text = await res.text();
          setCsvText(text);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!csvText) return;
    try {
      setError(null);
      const parsed = parseCsvText(csvText);
      setRecords(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to parse CSV";
      setError(msg);
    }
  }, [csvText]);

  const decorated = useMemo(() => (records ? decorateWithCoarse(records) : []), [records]);
  const filtered = useMemo(() => {
    if (!decorated.length) return [];
    if (preset === "custom" && customFrom && customTo) {
      return filterByDateRange(decorated, "custom", { from: new Date(customFrom), to: new Date(customTo) });
    }
    return filterByDateRange(decorated, preset);
  }, [decorated, preset, customFrom, customTo]);

  const dayBuckets = useMemo(() => bucketByDay(filtered), [filtered]);
  const totals = useMemo(() => sumTotals(filtered), [filtered]);
  const totalAll = useMemo(() => Object.values(totals).reduce((a, b) => a + b, 0), [totals]);
  const activityTotals = useMemo(() => (selected ? sumByActivityWithinCoarse(filtered, selected) : {}), [filtered, selected]);
  const selectedDaily = useMemo(() => (selected ? bucketByDayForCoarse(filtered, selected) : []), [filtered, selected]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const parsed = await parseCsvFile(file);
      setRecords(parsed);
      setCsvText(await file.text());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to parse file";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onUploadToGitHub() {
    if (!csvText) return;
    const blob = new Blob([csvText], { type: "text/csv" });
    const form = new FormData();
    form.append("file", blob, "stt_records_latest.csv");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || j?.error || "Upload failed");
      }
      alert("Uploaded & committed to GitHub.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-white text-black dark:bg-black dark:text-white">
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold">Personal Activity Dashboard</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="group block cursor-pointer rounded-lg border-2 border-dashed border-zinc-300 p-3 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-400">
            <span className="block text-sm opacity-80 group-hover:opacity-100">Drop CSV or click to upload</span>
            <input className="hidden" type="file" accept=".csv,text/csv" onChange={onFileChange} />
          </label>
          <select
            className="rounded border px-2 py-1 text-sm text-black"
            value={preset}
            onChange={(e) => setPreset(e.target.value as RangePreset)}
          >
            <option value="1d">Last 1 day</option>
            <option value="2d">Last 2 days</option>
            <option value="3d">Last 3 days</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
            <option value="custom">Custom</option>
          </select>
          {preset === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" className="rounded border px-2 py-1 text-black" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span>to</span>
              <input type="date" className="rounded border px-2 py-1 text-black" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
          <button
            className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black disabled:opacity-50"
            onClick={onUploadToGitHub}
            disabled={loading || !csvText}
          >
            Upload CSV to GitHub
          </button>
          {loading && <span className="text-sm opacity-70">Working…</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>

        <section className="mt-8">
          <h2 className="mb-2 inline-block rounded bg-blue-50 px-2 py-1 text-lg font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">Daily minutes by category</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart
                data={dayBuckets.map((d) => ({
                  day: d.day,
                  ...d.totals,
                }))}
                stackOffset="expand"
              >
                <XAxis dataKey="day" tick={{ fill: "currentColor" }} />
                <YAxis hide tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip formatter={(value: number | string, name: string) => [`${Math.round(Number(value))} min`, name]} />
                <Legend />
                {Object.keys(COLORS).map((key) => (
                  <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[key as CoarseType]} fill={COLORS[key as CoarseType]} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-64 w-full">
            <h3 className="mb-2 inline-block rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">Totals and share</h3>
            <ul className="space-y-1 text-sm">
              {coarseTypes.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <button
                    className={`inline-flex items-center gap-2 rounded px-2 py-1 transition ${selected === t ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
                    onClick={() => setSelected(selected === t ? null : t)}
                    title="Drill down"
                  >
                    <span className="inline-block w-3 rounded-sm" style={{ background: COLORS[t], height: 10 }} />
                    <span className="min-w-[80px] text-left">{t}</span>
                    <span className="font-semibold">{formatMinutesAdaptive(totals[t])}</span>
                    <span className="opacity-70">({percent(totals[t], totalAll)})</span>
                  </button>
                </li>
              ))}
              {selected && (
                <li className="pt-2">
                  <button className="text-xs opacity-70 hover:opacity-100" onClick={() => setSelected(null)}>Clear drilldown</button>
                </li>
              )}
            </ul>
          </div>
          <div className="h-64 w-full">
            <h3 className="mb-2 inline-block rounded bg-fuchsia-50 px-2 py-1 font-semibold text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">Share by category</h3>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={coarseTypes.map((t) => ({ name: t, value: totals[t] }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  onClick={(e) => {
                    const name = (e?.name as CoarseType) || null;
                    if (name) setSelected(selected === name ? null : name);
                  }}
                >
                  {coarseTypes.map((t) => (
                    <Cell key={t} fill={COLORS[t]} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [`${formatMinutesAdaptive(Number(v))} (${percent(Number(v), totalAll)})`, String(name)]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {selected && (
          <section className="mt-10">
            <h2 className="mb-2 inline-block rounded bg-amber-50 px-2 py-1 text-lg font-semibold capitalize text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">{selected} drilldown</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="h-72 w-full">
                <h4 className="mb-2 text-sm font-medium">Daily minutes</h4>
                <ResponsiveContainer>
                  <LineChart data={selectedDaily}>
                    <XAxis dataKey="day" tick={{ fill: "currentColor" }} />
                    <YAxis tick={{ fill: "currentColor" }} />
                    <Tooltip formatter={(v) => `${Math.round(Number(v))} min`} />
                    <Legend />
                    <Line type="monotone" dataKey="minutes" stroke={COLORS[selected]} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-72 w-full overflow-auto">
                <h4 className="mb-2 text-sm font-medium">Top activities</h4>
                <BarChart width={500} height={260} data={Object.entries(activityTotals).map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip formatter={(v) => `${formatMinutesAdaptive(Number(v))} (${percent(Number(v), totals[selected])})`} />
                  <Bar dataKey="value" fill={COLORS[selected]} />
                </BarChart>
                <ul className="mt-2 space-y-1 text-sm">
                  {Object.entries(activityTotals)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(([name, value]) => {
                      // Sum inherited realpausa for this activity in filtered data
                      const pauseTotal = filtered.filter((r) => r.activity === "realpausa" && r.inheritedFrom === name && r.coarse === selected).reduce((sum, r) => sum + r.minutes, 0);
                      return (
                        <li key={name} className="flex items-center justify-between">
                          <span className="truncate pr-2" title={name}>{name}</span>
                          <span className="tabular-nums">
                            {formatMinutesAdaptive(value)} ({percent(value, totals[selected])})
                            {pauseTotal > 0 && (
                              <span className="ml-2 opacity-70">of which {formatMinutesAdaptive(pauseTotal)} is pause</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

