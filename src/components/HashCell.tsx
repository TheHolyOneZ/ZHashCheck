// Copyright (c) 2026 TheHolyOneZ

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { algoLabel, errMsg, isLegacy, truncateHash } from "@/lib/format";
import { useContextMenu } from "@/hooks/useContextMenu";
import type { Algo } from "@/bindings/Algo";

interface Props {
  algo: Algo;
  hex: string;
  className?: string;
  full?: boolean;
}

export function HashCell({ algo, hex, className, full = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await writeText(hex);
      setCopied(true);
      toast.success(`${algoLabel(algo)} copied`);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      toast.error(`Copy failed: ${errMsg(e)}`);
    }
  }

  async function copyAs(text: string, label: string) {
    try {
      await writeText(text);
      toast.success(`${label} copied`);
    } catch (e) {
      toast.error(`Copy failed: ${errMsg(e)}`);
    }
  }

  const onContextMenu = useContextMenu(() => [
    { label: `Copy ${algoLabel(algo)} hash`, onSelect: copy },
    { label: "Copy uppercase", onSelect: () => copyAs(hex.toUpperCase(), `${algoLabel(algo)} (uppercase)`) },
    { label: `Copy as "${algo} = hash"`, onSelect: () => copyAs(`${algo} = ${hex}`, "Hash") },
  ]);

  return (
    <div className={cn("group flex items-center gap-2", className)} onContextMenu={onContextMenu}>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
          isLegacy(algo)
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : "bg-muted text-muted-foreground",
        )}
        title={isLegacy(algo) ? `${algoLabel(algo)} is broken for security purposes` : algoLabel(algo)}
      >
        {algoLabel(algo)}
      </span>
      <code
        className="flex-1 truncate font-mono text-[12px] text-foreground"
        title={hex}
      >
        {full ? hex : truncateHash(hex, 10, 10)}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
        aria-label={`Copy ${algoLabel(algo)}`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
