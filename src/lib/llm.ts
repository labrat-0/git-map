"use client";

import type { CommitDiff } from "./types";
import { getKey, getModel } from "./byok";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Keep prompts cheap: cap the diff payload. */
const MAX_DIFF_CHARS = 12_000;
/** Files that are noise for a summary — skip their patches. */
const SKIP_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|.*\.min\.(js|css)|.*\.map)$/;

function buildDiffText(diff: CommitDiff): string {
  let out = `Commit: ${diff.message.split("\n")[0]}\n`;
  out += `(+${diff.additions} / -${diff.deletions} across ${diff.files.length} files)\n\n`;
  for (const f of diff.files) {
    if (SKIP_FILE.test(f.filename)) {
      out += `# ${f.filename} (${f.status}, +${f.additions}/-${f.deletions}) [omitted]\n`;
      continue;
    }
    out += `# ${f.filename} (${f.status})\n${f.patch ?? "(no patch)"}\n\n`;
    if (out.length > MAX_DIFF_CHARS) {
      out = out.slice(0, MAX_DIFF_CHARS) + "\n...[truncated]";
      break;
    }
  }
  return out;
}

/**
 * Summarize a commit diff into exactly 3 plain-English bullets.
 * Calls OpenRouter directly from the browser with the user's own key.
 * Throws on missing key or API error.
 */
export async function summarizeDiff(diff: CommitDiff): Promise<string[]> {
  const key = getKey();
  if (!key) throw new Error("No API key set. Add one in Settings.");
  const model = getModel();

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "git-map",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You summarize git commit diffs. Reply with EXACTLY three concise bullet points in plain English describing what changed and why it matters. No preamble, no markdown headers. Start each line with '- '.",
        },
        { role: "user", content: buildDiffText(diff) },
      ],
      temperature: 0.2,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  return content
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}
