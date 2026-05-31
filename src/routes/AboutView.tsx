// Copyright (c) 2026 TheHolyOneZ

import { toast } from "sonner";
import {
  Github,
  Globe,
  ExternalLink,
  Shield,
  Cpu,
  Heart,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openExternal } from "@/lib/ipc";
import { errMsg } from "@/lib/format";
import iconUrl from "@/assets/icon.png";

async function open(url: string) {
  try {
    await openExternal(url);
  } catch (e) {
    toast.error(`Failed to open link: ${errMsg(e)}`);
  }
}

const TECH = [
  { name: "Tauri v2", note: "Rust-powered desktop shell" },
  { name: "Rust", note: "Hashing engine, IPC, jobs" },
  { name: "React 18", note: "UI runtime" },
  { name: "TypeScript", note: "End-to-end types via ts-rs" },
  { name: "Tailwind", note: "Design system" },
  { name: "shadcn/ui", note: "Radix-based primitives" },
  { name: "Zustand", note: "UI state" },
  { name: "TanStack Virtual", note: "100k-row lists" },
  { name: "SQLite", note: "Local-only history" },
  { name: "BLAKE3 · SHA-2/3 · xxh3", note: "Algorithm crates" },
];

export function AboutView() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="text-sm font-semibold">About</h1>
        <span className="ml-3 text-xs text-muted-foreground">
          What this tool is, who built it, and where to find more.
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">

        <section className="relative overflow-hidden border-b">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(900px 360px at 15% -10%, rgba(99,102,241,0.35), transparent 60%), radial-gradient(700px 320px at 95% 10%, rgba(16,185,129,0.18), transparent 65%)",
            }}
          />
          <div className="relative flex flex-col items-center gap-4 px-6 py-12 text-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -z-10 rounded-2xl blur-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(16,185,129,0.35))",
                }}
              />
              <img
                src={iconUrl}
                alt="ZHashCheck"
                className="h-28 w-28 rounded-2xl ring-1 ring-border/60"
                draggable={false}
              />
            </div>
            <div className="space-y-2">
              <h2 className="bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-emerald-500 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
                ZHashCheck
              </h2>
              <p className="mx-auto max-w-xl text-xs text-muted-foreground">
                A fast, fully offline desktop utility for hashing, verifying,
                comparing folders, and finding duplicates — every algorithm
                computed in a single streaming pass.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <Badge icon={<Shield className="h-3 w-3" />}>Fully offline</Badge>
              <Badge icon={<Scale className="h-3 w-3" />}>GPL-3.0-or-later</Badge>
              <Badge icon={<Cpu className="h-3 w-3" />}>Streaming multi-digest</Badge>
              <Badge icon={<Sparkles className="h-3 w-3" />}>Trash-only delete</Badge>
            </div>
          </div>
        </section>

        <div className="grid gap-4 p-4 lg:grid-cols-2">

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-500" />
                This project
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Documentation, releases, and source for ZHashCheck.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <LinkRow
                label="Project page"
                detail="zsync.eu/zhashcheck/"
                icon={<Globe className="h-4 w-4" />}
                onClick={() => open("https://zsync.eu/zhashcheck/")}
              />
              <LinkRow
                label="Source on GitHub"
                detail="github.com/TheHolyOneZ/ZHashCheck"
                icon={<Github className="h-4 w-4" />}
                onClick={() => open("https://github.com/TheHolyOneZ/ZHashCheck")}
              />
              <LinkRow
                label="License — GNU GPL-3.0-or-later"
                detail="gnu.org/licenses/gpl-3.0.html"
                icon={<Scale className="h-4 w-4" />}
                onClick={() => open("https://www.gnu.org/licenses/gpl-3.0.html")}
              />
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Built and maintained by
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                One developer, working in the open.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border bg-gradient-to-br from-indigo-500/5 to-transparent p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
                  Z
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">TheHolyOneZ</div>
                  <div className="text-[11px] text-muted-foreground">
                    Author · Maintainer
                  </div>
                </div>
              </div>
              <LinkRow
                label="GitHub profile"
                detail="github.com/TheHolyOneZ"
                icon={<Github className="h-4 w-4" />}
                onClick={() => open("https://github.com/TheHolyOneZ")}
              />
              <LinkRow
                label="More projects"
                detail="zsync.eu"
                icon={<Globe className="h-4 w-4" />}
                onClick={() => open("https://zsync.eu/")}
              />
            </CardContent>
          </Card>


          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-emerald-500" />
                Built with
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                A small set of well-known pieces — no network plugins, no
                telemetry crates, no auto-updater. Easy to audit with{" "}
                <code className="font-mono">cargo tree</code>.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {TECH.map((t) => (
                  <div
                    key={t.name}
                    className="rounded-md border bg-card/50 px-3 py-2 transition hover:border-primary/40 hover:bg-accent/30"
                  >
                    <div className="truncate text-xs font-semibold">{t.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {t.note}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-500" />
                License
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                ZHashCheck is free software: you can redistribute it and/or
                modify it under the terms of the GNU General Public License as
                published by the Free Software Foundation, either version 3 of
                the License, or (at your option) any later version.
              </p>
              <p>
                It is distributed in the hope that it will be useful, but
                WITHOUT ANY WARRANTY; without even the implied warranty of
                MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
                GNU General Public License for more details.
              </p>
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => open("https://www.gnu.org/licenses/gpl-3.0.html")}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Read the full license
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="px-4 pb-6 text-center text-[10px] text-muted-foreground">
          Made with care · No telemetry · No network calls · Local-only history
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-card/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

function LinkRow({
  label,
  detail,
  icon,
  onClick,
}: {
  label: string;
  detail: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-md border bg-card/40 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent/40"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition group-hover:bg-primary/15 group-hover:text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{label}</span>
        <span className="block truncate font-mono text-[10px] text-muted-foreground">
          {detail}
        </span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
    </button>
  );
}
