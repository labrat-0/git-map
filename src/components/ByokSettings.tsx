"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_MODEL,
  clearKey,
  getKey,
  getModel,
  setKey,
  setModel,
} from "@/lib/byok";

export function ByokSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [keyValue, setKeyValue] = useState("");
  const [modelValue, setModelValue] = useState(DEFAULT_MODEL);
  const [hasStored, setHasStored] = useState(false);

  // Sync form fields to stored values when the modal opens (render-time reset).
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setHasStored(!!getKey());
      setKeyValue("");
      setModelValue(getModel());
    }
  }

  if (!open) return null;

  const save = () => {
    if (keyValue.trim()) setKey(keyValue);
    setModel(modelValue);
    setHasStored(!!getKey());
    toast.success("Settings saved (local only)");
    onClose();
  };

  const remove = () => {
    clearKey();
    setHasStored(false);
    setKeyValue("");
    toast.success("Key cleared");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="brand-edge bg-background w-[440px] max-w-[92vw]">
        <div className="px-4 py-3 border-b border-white flex items-center justify-between">
          <span className="font-mono text-[13px]">AI settings — BYOK</span>
          <button
            onClick={onClose}
            className="brand-edge p-1 hover:brand-edge-invert hover:bg-white hover:text-black"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <p className="text-[11px] leading-snug text-[var(--muted)]">
            AI summaries are optional. Your key is stored{" "}
            <span className="text-foreground">only in this browser</span> and is sent{" "}
            <span className="text-foreground">directly to OpenRouter</span> — never to the
            git-map server.
          </p>

          <label className="block">
            <span className="font-mono text-[11px]">OpenRouter API key</span>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={hasStored ? "•••••••• (stored)" : "sk-or-..."}
              className="mt-1 w-full brand-edge bg-transparent px-2 py-1 font-mono text-[12px] outline-none"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[11px]">Model</span>
            <input
              type="text"
              value={modelValue}
              onChange={(e) => setModelValue(e.target.value)}
              placeholder={DEFAULT_MODEL}
              className="mt-1 w-full brand-edge bg-transparent px-2 py-1 font-mono text-[12px] outline-none"
            />
          </label>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={remove}
              disabled={!hasStored}
              className="brand-edge px-3 py-1 text-[11px] font-mono hover:brand-edge-invert hover:bg-white hover:text-black disabled:opacity-40"
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
    </div>
  );
}
