"use client";

/**
 * Multi-provider BYOK registry. All calls are browser -> provider DIRECT
 * (key never touches the git-map server). Three API families are supported:
 *   - "openai"    : OpenAI-compatible (OpenRouter, OpenAI, local/custom)
 *   - "anthropic" : Anthropic Messages API
 *   - "google"    : Google Gemini generateContent
 *
 * Note: OpenAI's cloud API does not send CORS headers, so a direct browser
 * call is usually blocked — surfaced to the user as a clear error.
 */

export type ProviderId = "openrouter" | "openai" | "anthropic" | "google" | "local";
export type ProviderFamily = "openai" | "anthropic" | "google";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  family: ProviderFamily;
  defaultBaseUrl: string;
  needsKey: boolean;
  editableBaseUrl: boolean;
  defaultModel: string;
  note?: string;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    family: "openai",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    editableBaseUrl: false,
    defaultModel: "google/gemini-2.0-flash-001",
    note: "One key, hundreds of models (incl. OpenAI/Claude/Gemini).",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    family: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    needsKey: true,
    editableBaseUrl: false,
    defaultModel: "claude-haiku-4-5-20251001",
  },
  {
    id: "google",
    label: "Google Gemini",
    family: "google",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    needsKey: true,
    editableBaseUrl: false,
    defaultModel: "gemini-2.0-flash",
  },
  {
    id: "openai",
    label: "OpenAI",
    family: "openai",
    defaultBaseUrl: "https://api.openai.com/v1",
    needsKey: true,
    editableBaseUrl: false,
    defaultModel: "gpt-4o-mini",
    note: "Browser-direct is usually blocked by CORS — use OpenRouter for OpenAI models.",
  },
  {
    id: "local",
    label: "Local / custom",
    family: "openai",
    defaultBaseUrl: "http://localhost:11434/v1",
    needsKey: false,
    editableBaseUrl: true,
    defaultModel: "",
    note: "Ollama, LM Studio, vLLM… any OpenAI-compatible endpoint. $0.",
  },
];

export function getProviderDef(id: ProviderId): ProviderDef {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

function authHeaders(p: ProviderDef, key: string): Record<string, string> {
  if (p.family === "anthropic") {
    return {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }
  // openai family; google passes the key in the query string instead.
  return key ? { Authorization: `Bearer ${key}` } : {};
}

function corsHint(p: ProviderDef): string {
  return p.id === "openai"
    ? " OpenAI blocks browser calls (CORS) — use OpenRouter for OpenAI models."
    : "";
}

/** List available model ids for a provider. */
export async function listModels(
  p: ProviderDef,
  key: string,
  baseUrl: string,
): Promise<string[]> {
  try {
    if (p.family === "google") {
      const res = await fetch(`${baseUrl}/models?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const json = (await res.json()) as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };
      return (json.models ?? [])
        .filter(
          (m) =>
            !m.supportedGenerationMethods ||
            m.supportedGenerationMethods.includes("generateContent"),
        )
        .map((m) => m.name.replace(/^models\//, ""))
        .sort();
    }

    // openai + anthropic both expose GET /models with {data:[{id}]}.
    const res = await fetch(`${baseUrl}/models`, { headers: authHeaders(p, key) });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    return (json.data ?? []).map((m) => m.id).sort();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // CORS failures surface as a TypeError "Failed to fetch".
    throw new Error(`Could not load models: ${msg}.${corsHint(p)}`);
  }
}

/** Run a single completion. Returns the raw assistant text. */
export async function complete(
  p: ProviderDef,
  key: string,
  baseUrl: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  try {
    if (p.family === "anthropic") {
      const res = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: { ...authHeaders(p, key), "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const json = (await res.json()) as {
        content?: Array<{ text?: string }>;
      };
      return json.content?.map((c) => c.text ?? "").join("") ?? "";
    }

    if (p.family === "google") {
      const res = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
          }),
        },
      );
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (
        json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
        ""
      );
    }

    // openai family
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        ...authHeaders(p, key),
        "Content-Type": "application/json",
        "HTTP-Referer":
          typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "git-map",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${msg}${corsHint(p)}`);
  }
}
