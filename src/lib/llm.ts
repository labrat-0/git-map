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
