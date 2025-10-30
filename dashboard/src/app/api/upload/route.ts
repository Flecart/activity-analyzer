import { NextRequest, NextResponse } from "next/server";

// This route commits an uploaded CSV to the GitHub repo using the Contents API.
// Configure env vars on Vercel:
// - GITHUB_TOKEN: fine-scoped PAT (repo:contents)
// - GITHUB_REPO: e.g. "<owner>/<repo>"
// - GITHUB_BRANCH: e.g. "main"
// - GITHUB_FILE_PATH: path in repo, e.g. "dashboard/public/data/stt_records_latest.csv"

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const path = process.env.GITHUB_FILE_PATH || "dashboard/public/data/stt_records_latest.csv";
    if (!token || !repo) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const content = Buffer.from(await file.arrayBuffer()).toString("base64");

    // Get current file SHA if exists
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    let sha: string | undefined = undefined;
    if (getRes.ok) {
      const j = (await getRes.json()) as { sha?: string };
      sha = j.sha;
    }

    const commitRes = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      body: JSON.stringify({
        message: `chore(data): update CSV via dashboard upload (${new Date().toISOString()})`,
        content,
        branch,
        sha,
      }),
    });

    if (!commitRes.ok) {
      const err = await commitRes.text();
      return NextResponse.json({ error: "Commit failed", detail: err }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


