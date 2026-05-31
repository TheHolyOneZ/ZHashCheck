// Copyright (c) 2026 TheHolyOneZ

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings, setSettings as saveSettings } from "@/lib/ipc";
import { errMsg } from "@/lib/format";
import { useUiStore } from "@/store/ui";
import type { Settings } from "@/bindings/Settings";
import type { Algo } from "@/bindings/Algo";

const ALL_ALGOS: Algo[] = [
  "md5", "sha1", "sha224", "sha256", "sha384", "sha512",
  "sha3-256", "sha3-512", "blake2b256", "blake2s256",
  "blake3", "xxh3-64", "xxh3-128", "crc32",
];

export function SettingsView() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const setUiTheme = useUiStore((u) => u.setTheme);
  const setUiDensity = useUiStore((u) => u.setDensity);
  const setUiAlgos = useUiStore((u) => u.setDefaultAlgos);

  useEffect(() => { void (async () => {
    try { setS(await getSettings()); }
    catch (e) { toast.error(errMsg(e)); }
  })(); }, []);

  if (!s) {
    return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading…</div>;
  }

  function update<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((cur) => cur ? { ...cur, [k]: v } : cur);
  }

  async function persist() {
    if (!s) return;
    setBusy(true);
    try {
      await saveSettings(s);
      setUiTheme(s.theme as "system" | "light" | "dark");
      setUiDensity(s.density as "comfortable" | "compact");
      setUiAlgos(s.defaultAlgos);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">Settings</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={persist} disabled={busy}>
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default algorithms</CardTitle>
            <p className="text-[11px] text-muted-foreground">Pre-checked the next time you open the Hash tab.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ALGOS.map((a) => {
                const on = s.defaultAlgos.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => update(
                      "defaultAlgos",
                      on ? s.defaultAlgos.filter((x) => x !== a) : [...s.defaultAlgos, a],
                    )}
                    className={
                      "rounded-md border px-2 py-0.5 text-[11px] font-medium transition " +
                      (on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground")
                    }
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <p className="text-[11px] text-muted-foreground">Visual preferences. Theme follows your OS by default.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Theme">
              <Segmented
                value={s.theme}
                options={["system", "light", "dark"]}
                onChange={(v) => update("theme", v)}
              />
            </Row>
            <Row label="Density">
              <Segmented
                value={s.density}
                options={["comfortable", "compact"]}
                onChange={(v) => update("density", v)}
              />
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scanning</CardTitle>
            <p className="text-[11px] text-muted-foreground">How folder scans behave when picking a folder to hash or compare.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Follow symlinks">
              <Toggle on={s.followSymlinks} onChange={(v) => update("followSymlinks", v)} />
            </Row>
            <Row label="Include hidden files">
              <Toggle on={s.includeHidden} onChange={(v) => update("includeHidden", v)} />
            </Row>
            <Row label="Thread count">
              <Input
                type="number"
                value={s.threadCount ?? ""}
                placeholder="auto"
                onChange={(e) => update("threadCount", e.target.value ? Number(e.target.value) : null)}
                className="w-24"
              />
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <p className="text-[11px] text-muted-foreground">Older entries are pruned automatically after this many days. Set to 0 to keep forever.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Retention (days, 0 = forever)">
              <Input
                type="number"
                value={s.historyRetentionDays}
                onChange={(e) => update("historyRetentionDays", Number(e.target.value || 0))}
                className="w-24"
              />
            </Row>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            ZHashCheck is fully offline. No telemetry, no auto-update, no network requests.
            Licensed under GPL-3.0-or-later.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Segmented({ value, options, onChange }: {
  value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={
            "px-2.5 py-1 text-[11px] capitalize transition " +
            (value === o ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")
          }
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={
        "relative inline-flex h-5 w-9 items-center rounded-full transition " +
        (on ? "bg-primary" : "bg-muted")
      }
      aria-pressed={on}
    >
      <span
        className={
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition " +
          (on ? "translate-x-4" : "translate-x-0.5")
        }
      />
    </button>
  );
}
