"use client";

/**
 * BYOK key + model live ONLY in the browser (localStorage). They are never sent
 * to the git-map server. The summarize call goes browser -> OpenRouter directly.
 */
const KEY_STORAGE = "gitmap.openrouter.key";
const MODEL_STORAGE = "gitmap.openrouter.model";

export const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export function getKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_STORAGE);
}

export function setKey(key: string): void {
  window.localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearKey(): void {
  window.localStorage.removeItem(KEY_STORAGE);
}

export function getModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return window.localStorage.getItem(MODEL_STORAGE) ?? DEFAULT_MODEL;
}

export function setModel(model: string): void {
  window.localStorage.setItem(MODEL_STORAGE, model.trim() || DEFAULT_MODEL);
}

export function hasKey(): boolean {
  return !!getKey();
}
