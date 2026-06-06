"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  clearKey,
  getBaseUrl,
  getKey,
  getModel,
  getProviderId,
  setBaseUrl,
  setKey,
  setModel,
  setProviderId,
} from "@/lib/byok";
import {
  PROVIDERS,
  getProviderDef,
  listModels,
  type ProviderId,
} from "@/lib/providers";
import { cn } from "@/lib/utils";

export function ByokSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [providerId, setProviderIdState] = useState<ProviderId>("openrouter");
  const [keyValue, setKeyValue] = useState("");
  const [baseUrl, setBaseUrlState] = useState("");
  const [model, setModelState] = useState("");
  const [models, setModels] = useState<string[] | null>(null);
  const [filter, setFilter] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  const def = getProviderDef(providerId);

  // Initialize fields from storage when the modal opens (render-time reset).
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) loadProvider(getProviderId());
  }

  function loadProvider(id: ProviderId) {
    setProviderIdState(id);
    setKeyValue(getKey(id));
    setBaseUrlState(getBaseUrl(id));
    setModelState(getModel(id));
    setModels(null);
    setFilter("");
  }

  function selectProvider(id: ProviderId) {
    setProviderId(id); // persist choice immediately
    loadProvider(id);
  }

  async function loadModelList() {
    const d = getProviderDef(providerId);
    if (d.needsKey && !keyValue.trim()) {
      toast.error("Enter a key first.");
      return;
    }
    // Persist key/base so a load reflects what will be used.
    setKey(providerId, keyValue);
    setBaseUrl(providerId, baseUrl);
    setLoadingModels(true);
    try {
      const list = await listModels(d, keyValue.trim(), baseUrl.trim());
      setModels(list);
      if (list.length === 0) toast.message("No models returned.");
    } catch (e) {
      setModels(null);
      toast.error(e instanceof Error ? e.message : "Failed to load models");
    } finally {
      setLoadingModels(false);
    }
  }

  function pickModel(m: string) {
    setModelState(m);
    setModel(providerId, m);
  }

  function save() {
    setProviderId(providerId);
    if (keyValue.trim()) setKey(providerId, keyValue);
    if (def.editableBaseUrl) setBaseUrl(providerId, baseUrl);
    if (model.trim()) setModel(providerId, model);
    toast.success("Settings saved (local only)");
    onClose();
  }

  const filteredModels = useMemo(() => {
    if (!models) return [];
    const q = filter.trim().toLowerCase();
    return q ? models.filter((m) => m.toLowerCase().includes(q)) : models;
  }, [models, filter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
      <div className="brand-edge bg-background w-[520px] max-w-[94vw] max-h-[88vh] flex flex-col">
        <div className="h-11 shrink-0 px-4 border-b border-white flex items-center justify-between">
          <span className="col-eyebrow">AI settings · BYOK</span>
          <button
            onClick={onClose}
            className="brand-edge p-1 hover:brand-edge-invert hover:bg-white hover:text-black"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {/* Provider tabs */}
          <div>
            <div className="col-eyebrow mb-1.5">provider</div>
            <div className="flex flex-wrap gap-1.5">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProvider(p.id)}
                  className={cn(
                    "brand-edge px-2.5 py-1 font-mono text-[11px] transition-colors",
                    "hover:bg-white hover:text-black",
                    p.id === providerId && "bg-white text-black",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {def.note && (
              <p className="text-[10px] text-[var(--muted)] mt-2 leading-snug">
                {def.note}
              </p>
            )}
          </div>

          {/* Key */}
          {def.needsKey && (
            <label className="block">
              <span className="col-eyebrow">{def.label} API key</span>
              <input
                type="password"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="paste key"
                className="mt-1 w-full brand-edge bg-transparent px-2 py-1 font-mono text-[12px] outline-none"
              />
            </label>
          )}

          {/* Base URL (local/custom) */}
          {def.editableBaseUrl && (
            <label className="block">
              <span className="col-eyebrow">base URL</span>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrlState(e.target.value)}
                placeholder={def.defaultBaseUrl}
                className="mt-1 w-full brand-edge bg-transparent px-2 py-1 font-mono text-[12px] outline-none"
              />
            </label>
          )}

          {/* Model */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="col-eyebrow">model</span>
              <button
                onClick={loadModelList}
                disabled={loadingModels}
                className="brand-edge px-2 py-0.5 font-mono text-[10px] inline-flex items-center gap-1 hover:brand-edge-invert hover:bg-white hover:text-black disabled:opacity-40"
              >
                {loadingModels ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : null}
                load models
              </button>
            </div>

            {/* Current selection */}
            <input
              type="text"
              value={model}
              onChange={(e) => setModelState(e.target.value)}
              placeholder="model id (or load + pick below)"
              className="w-full brand-edge bg-transparent px-2 py-1 font-mono text-[12px] outline-none"
            />

            {/* Loaded model list — contained + scrollable. */}
            {models && (
              <div className="mt-2 brand-edge">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={`filter ${models.length} models`}
                  className="w-full bg-transparent px-2 py-1 font-mono text-[11px] outline-none border-b border-white/20 placeholder:text-[var(--muted)]"
                />
                <div className="max-h-44 overflow-y-auto">
                  {filteredModels.length === 0 && (
                    <div className="px-2 py-2 font-mono text-[10px] text-[var(--muted)]">
                      no match
                    </div>
                  )}
                  {filteredModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => pickModel(m)}
                      className={cn(
                        "w-full text-left px-2 py-1 font-mono text-[11px] flex items-center gap-1.5 hover:bg-white hover:text-black transition-colors",
                        m === model && "bg-white text-black",
                      )}
                    >
                      {m === model ? (
                        <Check size={11} className="shrink-0" />
                      ) : (
                        <span className="w-[11px] shrink-0" />
                      )}
                      <span className="truncate">{m}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[var(--muted)] leading-snug">
            Keys are stored <span className="text-foreground">only in this browser</span> and
            sent <span className="text-foreground">directly to the provider</span> — never to
            the git-map server.
          </p>
        </div>

        <div className="h-12 shrink-0 px-4 border-t border-white flex items-center justify-between">
          <button
            onClick={() => {
              clearKey(providerId);
              setKeyValue("");
              toast.success("Key cleared");
            }}
            className="brand-edge px-3 py-1 text-[11px] font-mono hover:brand-edge-invert hover:bg-white hover:text-black"
          >
            clear key
          </button>
          <button
            onClick={save}
            className="brand-edge px-3 py-1 text-[11px] font-mono hover:brand-edge-invert hover:bg-white hover:text-black"
          >
            save
          </button>
        </div>
      </div>
    </div>
  );
}
