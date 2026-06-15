"use client";

import type { CommitDiff } from "./types";
import { getBaseUrl, getKey, getModel, getProviderId, isConfigured } from "./byok";
import { complete, completeStream, getProviderDef } from "./providers";

/** Keep prompts cheap: cap the diff payload. */
const MAX_DIFF_CHARS = 12_000;
/** Files that are noise for a summary — skip their patches. */
const SKIP_FILE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|.*\.min\.(js|css)|.*\.map)$/;

const SYSTEM_PROMPT =
  "You summarize git commit diffs. Reply with EXACTLY three concise bullet points in plain English describing what changed and why it matters. No preamble, no markdown headers. Start each line with '- '.";

/** Cap the combined run payload — messages + file lists, not full patches. */
const MAX_RUN_CHARS = 8_000;
const RUN_SYSTEM_PROMPT =
  "You summarize a sequence of related git commits (a run of work) as a whole. Reply with EXACTLY three concise bullet points in plain English describing the overall theme and what changed across the run — not commit-by-commit. No preamble, no markdown headers. Start each line with '- '.";

function firstLine(msg: string): string {
  return (msg.split("\n")[0] ?? "").trim();
}

function buildRunText(diffs: CommitDiff[]): string {
  let out = `A run of ${diffs.length} related commits (newest first):\n\n`;
  for (const d of diffs) {
    out += `- ${firstLine(d.message)} (+${d.additions}/-${d.deletions}, ${d.files.length} files)\n`;
    const names = d.files.slice(0, 6).map((f) => f.filename).join(", ");
    if (names) {
      out += `    files: ${names}${d.files.length > 6 ? ", …" : ""}\n`;
    }
    if (out.length > MAX_RUN_CHARS) {
      out = out.slice(0, MAX_RUN_CHARS) + "\n…[truncated]";
      break;
    }
  }
  return out;
}

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

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Summarize a commit diff into 3 plain-English bullets using the user's
 * selected provider + key, called directly from the browser.
 */
export async function summarizeDiff(diff: CommitDiff): Promise<string[]> {
  if (!isConfigured()) {
    throw new Error("AI not configured. Open Settings to pick a provider/model.");
  }
  const id = getProviderId();
  const def = getProviderDef(id);
  const text = await complete(
    def,
    getKey(id),
    getBaseUrl(id),
    getModel(id),
    SYSTEM_PROMPT,
    buildDiffText(diff),
  );
  return parseBullets(text);
}

/**
 * Same as summarizeDiff but streams tokens via onToken as they arrive.
 * Returns the final parsed bullets once the stream is complete.
 */
export async function summarizeDiffStream(
  diff: CommitDiff,
  onToken: (token: string) => void,
): Promise<string[]> {
  if (!isConfigured()) {
    throw new Error("AI not configured. Open Settings to pick a provider/model.");
  }
  const id = getProviderId();
  const def = getProviderDef(id);
  let fullText = "";
  await completeStream(
    def,
    getKey(id),
    getBaseUrl(id),
    getModel(id),
    SYSTEM_PROMPT,
    buildDiffText(diff),
    (token) => {
      fullText += token;
      onToken(token);
    },
  );
  return parseBullets(fullText);
}

/**
 * Summarize a whole run of commits into 3 bullets describing the overall
 * change. Uses commit messages + file lists (not full patches) to stay cheap.
 */
export async function summarizeRun(diffs: CommitDiff[]): Promise<string[]> {
  if (!isConfigured()) {
    throw new Error("AI not configured. Open Settings to pick a provider/model.");
  }
  const id = getProviderId();
  const def = getProviderDef(id);
  const text = await complete(
    def,
    getKey(id),
    getBaseUrl(id),
    getModel(id),
    RUN_SYSTEM_PROMPT,
    buildRunText(diffs),
  );
  return parseBullets(text);
}
