"use client";

import {
  getProviderDef,
  type ProviderId,
  PROVIDERS,
} from "./providers";

/**
 * BYOK config lives ONLY in the browser (localStorage). Keys are stored
 * per-provider so switching providers keeps each key. Nothing is sent to the
 * git-map server — completions go browser -> provider directly.
 */
const P_KEY = "gitmap.provider";
const key = (id: ProviderId) => `gitmap.key.${id}`;
const baseKey = (id: ProviderId) => `gitmap.baseurl.${id}`;
const modelKey = (id: ProviderId) => `gitmap.model.${id}`;

function isProviderId(v: string | null): v is ProviderId {
  return !!v && PROVIDERS.some((p) => p.id === v);
}

export function getProviderId(): ProviderId {
  if (typeof window === "undefined") return "openrouter";
  const v = window.localStorage.getItem(P_KEY);
  return isProviderId(v) ? v : "openrouter";
}
export function setProviderId(id: ProviderId): void {
  window.localStorage.setItem(P_KEY, id);
}

export function getKey(id: ProviderId): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key(id)) ?? "";
}
export function setKey(id: ProviderId, v: string): void {
  window.localStorage.setItem(key(id), v.trim());
}
export function clearKey(id: ProviderId): void {
  window.localStorage.removeItem(key(id));
}

export function getBaseUrl(id: ProviderId): string {
  const def = getProviderDef(id);
  if (typeof window === "undefined") return def.defaultBaseUrl;
  return window.localStorage.getItem(baseKey(id)) || def.defaultBaseUrl;
}
export function setBaseUrl(id: ProviderId, v: string): void {
  window.localStorage.setItem(baseKey(id), v.trim());
}

export function getModel(id: ProviderId): string {
  const def = getProviderDef(id);
  if (typeof window === "undefined") return def.defaultModel;
  return window.localStorage.getItem(modelKey(id)) || def.defaultModel;
}
export function setModel(id: ProviderId, v: string): void {
  window.localStorage.setItem(modelKey(id), v.trim());
}

/** Is the current provider configured enough to summarize? */
export function isConfigured(): boolean {
  const id = getProviderId();
  const def = getProviderDef(id);
  const hasKey = !def.needsKey || !!getKey(id);
  return hasKey && !!getModel(id);
}
