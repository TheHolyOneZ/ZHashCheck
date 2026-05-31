<div align="center">

<img src="./src-tauri/icons/icon.png" alt="ZHashCheck" width="128" height="128" />

# ZHashCheck

### Fast, fully offline file hashing for everyone.

Drag a file in. Get every hash instantly. Verify a download. Compare folders.
Find duplicates and reclaim space — safely.

<p>
  <a href="https://zsync.eu/zhashcheck/#download"><img alt="Download" src="https://img.shields.io/badge/download-zsync.eu%2Fzhashcheck-6366F1?style=flat-square" /></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-GPL--3.0--or--later-10B981?style=flat-square" /></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20%C2%B7%20macOS%20%C2%B7%20Linux-475569?style=flat-square" />
  <img alt="Offline" src="https://img.shields.io/badge/network-zero%20telemetry-F59E0B?style=flat-square" />
</p>

<sub>Built with <a href="https://tauri.app">Tauri v2</a> · React · Rust · TypeScript</sub>

</div>

---

## ✨ What is ZHashCheck?

**ZHashCheck** is a desktop app that does one thing extremely well: it tells you the *digital fingerprint* of any file on your computer, so you can:

- ✅ **Make sure a download isn't corrupted or tampered with**
- 🔍 **Spot duplicate files eating up your disk space**
- 📁 **Compare two folders to see if anything changed**
- 📋 **Read or generate `SHASUMS` files** like the ones published by Ubuntu, Debian, VLC, and most open-source projects

You don't need to know what a "hash" is to use it. Just drop a file in the window and ZHashCheck shows you the answer.

> Nothing is ever sent anywhere. ZHashCheck has no internet access and stores all your history locally on your machine.

---

## 🧭 Tour of the app

<table>
  <tr>
    <th align="left" width="160">Tab</th>
    <th align="left">What it does</th>
  </tr>
  <tr>
    <td><strong>Hash</strong></td>
    <td>Drop files (or a whole folder) anywhere in the window. Every algorithm you've enabled is computed in <em>one</em> pass over the file. Results stream in live — click any hash to copy.</td>
  </tr>
  <tr>
    <td><strong>Verify</strong></td>
    <td>Paste a hash you got from a website to confirm your download matches. Or open a whole <code>SHASUMS</code> file to verify every file in a release at once.</td>
  </tr>
  <tr>
    <td><strong>Compare</strong></td>
    <td>Point at two folders. ZHashCheck hashes both trees and shows you exactly which files are identical, which differ, and which exist on only one side.</td>
  </tr>
  <tr>
    <td><strong>Duplicates</strong></td>
    <td>Pick one or more folders to scan. ZHashCheck groups identical files together so you can free up space. <strong>Deletions always go to the OS Trash</strong>, never permanently.</td>
  </tr>
  <tr>
    <td><strong>History</strong></td>
    <td>Every file you've ever hashed is saved locally in a small SQLite database. Search by path or hash and find what you computed weeks ago.</td>
  </tr>
  <tr>
    <td><strong>Settings</strong></td>
    <td>Pick your default algorithms, theme (system/light/dark), density, history retention, and more.</td>
  </tr>
  <tr>
    <td><strong>About</strong></td>
    <td>Project info, links, license, and credits.</td>
  </tr>
</table>

---

## 🚀 Get it

> 💡 **All pre-built installers live on the project homepage** — not on GitHub.
> GitHub only hosts the source. Downloads are exclusively at **[zsync.eu/zhashcheck](https://zsync.eu/zhashcheck/#download)**.

<table>
  <tr>
    <td align="center" width="33%">
      <h3>🪟 Windows</h3>
      Download the <code>.msi</code> installer<br/>
      <sub>Windows 10 / 11</sub>
    </td>
    <td align="center" width="33%">
      <h3>🍏 macOS</h3>
      Download the <code>.dmg</code><br/>
      <sub>macOS 11 Big Sur or newer</sub>
    </td>
    <td align="center" width="33%">
      <h3>🐧 Linux</h3>
      <code>.deb</code> · <code>.rpm</code> · <code>AppImage</code><br/>
      <sub>Most modern distros</sub>
    </td>
  </tr>
</table>

**👉 [Download ZHashCheck from the official homepage](https://zsync.eu/zhashcheck/#download)**

<sub>Prefer to compile it yourself? See [Building from source](#-building-from-source) below — the full code is on GitHub.</sub>

---

## 🧠 Why use a hash checker?

When you download a file from the internet, two bad things can happen:

1. The download can **get corrupted** along the way (your file ends up broken).
2. Someone could **tamper with the file** (giving you malware instead of the real thing).

Most trustworthy projects publish a **hash** (a long string of letters and numbers) next to the download. If you compute the hash of *your* downloaded file and it matches *theirs*, you know the file is byte-for-byte correct.

ZHashCheck makes this:

- ⚡ **Instant** — just drag the file in.
- 🧷 **Safe** — comparisons are done in constant time (no timing leaks).
- 🧠 **Smart** — the algorithm is auto-detected from the hash length, so you don't have to guess.

---

## 🏆 What makes ZHashCheck different?

<table>
<tr><td>

### 🚄 Genuinely fast

One read pass feeds **every** algorithm in parallel. Computing SHA-256 + BLAKE3 + MD5 takes no longer than computing just one — because we only touch the bytes once.

</td><td>

### 🔒 Truly offline

No internet access. No telemetry. No auto-updater pinging a server. You can verify this yourself: `cargo tree | grep reqwest` returns nothing.

</td></tr>
<tr><td>

### 🧹 Safe duplicate removal

The deduper uses a three-stage filter (size → quick xxh3 → full BLAKE3) so it only fully hashes files that *could* be duplicates. And **every delete goes to your OS Trash** — never permanently.

</td><td>

### ⌨️ Keyboard-first

Everything has a shortcut. <kbd>Ctrl/Cmd</kbd>+<kbd>K</kbd> opens the command palette. Right-click anywhere useful for context actions. Switch tabs with <kbd>⌘1</kbd>–<kbd>⌘8</kbd>.

</td></tr>
</table>

---

## 🔬 Supported algorithms

<details>
<summary><strong>Click to expand the full list</strong></summary>

| Family | Algorithms | Notes |
|---|---|---|
| **Modern (recommended)** | SHA-256 · SHA-512 · BLAKE3 · BLAKE2b · BLAKE2s · SHA3-256 · SHA3-512 | Use these for new work. |
| **Common** | SHA-224 · SHA-384 | Less popular but still secure. |
| **Legacy** | MD5 · SHA-1 | Marked with a yellow "legacy" tag — still useful for **integrity** checks against publishers who only provide them, but **not safe for security purposes**. |
| **Non-cryptographic** | xxh3-64 · xxh3-128 · CRC32 | Extremely fast. Good for change detection, not for security. |

</details>

---

## 🛠️ Tech stack

<details>
<summary>For the curious — what's under the hood</summary>

| Layer | Tech |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) — small, native, secure |
| Backend | Rust (`tokio` + `rayon`) |
| Hashing | `sha2`, `sha3`, `md-5`, `sha1`, `blake3`, `blake2`, `xxhash-rust`, `crc32fast` |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| UI state | Zustand |
| Big lists | TanStack Virtual |
| Local DB | SQLite (via `tauri-plugin-sql`) |
| Types | `ts-rs` — Rust structs → TypeScript automatically |

No HTTP client. No auto-updater. No telemetry. No crash reporter calling home.

</details>

---

## 🧑‍💻 Building from source

> Skip this section if you just want to use the app — grab a pre-built installer from **[zsync.eu/zhashcheck](https://zsync.eu/zhashcheck/#download)** instead.

**Requirements:** [pnpm](https://pnpm.io), [Rust 1.80+](https://rustup.rs), and your platform's [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
# 1) Clone
git clone https://github.com/TheHolyOneZ/ZHashCheck.git
cd ZHashCheck

# 2) Install JS deps
pnpm install

# 3) Run in dev
pnpm tauri dev

# 4) Build installers for your current OS
pnpm tauri build
```

The built installer for your OS lands in `src-tauri/target/release/bundle/`.

### Other useful commands

```bash
pnpm typecheck                                       # frontend type check
pnpm lint                                            # frontend lint
cargo test --manifest-path src-tauri/Cargo.toml      # Rust tests
cargo clippy --manifest-path src-tauri/Cargo.toml \
  --all-targets -- -D warnings                       # Rust lint
```

---

## 🔐 Privacy & security posture

- 🌐 **Zero network calls.** The entire dependency tree is audited for HTTP clients and updaters.
- 🗃️ **All data is local.** History lives in a SQLite file inside the OS-standard app data folder.
- 🧮 **Constant-time compares.** Verifying a hash never leaks timing info.
- 🗑️ **No `rm` path.** Duplicates and deletions always go through the OS Trash via the `trash` crate.
- 🪪 **Scoped permissions.** The app only reads files you explicitly pick or drop in.

---

## 👤 Credits

<table>
<tr>
<td width="100" align="center">

<sub>**👨‍💻**</sub>

</td>
<td>

### TheHolyOneZ
**Author · Maintainer · Designer**

<a href="https://github.com/TheHolyOneZ">🐙 GitHub</a> &nbsp;·&nbsp;
<a href="https://zsync.eu/">🌐 zsync.eu</a> &nbsp;·&nbsp;
More projects, articles, and contact info at [zsync.eu](https://zsync.eu/).

</td>
</tr>
</table>

---

## 🔗 Links

| | |
|---|---|
| 🏠 **Project homepage** | <https://zsync.eu/zhashcheck/> |
| 📥 **Downloads (Windows · macOS · Linux)** | <https://zsync.eu/zhashcheck/#download> &nbsp; *(the only place pre-built binaries are published)* |
| 🐙 **Source code** | <https://github.com/TheHolyOneZ/ZHashCheck> |
| 🐛 **Report a bug / request a feature** | <https://github.com/TheHolyOneZ/ZHashCheck/issues> |
| 👤 **Developer's GitHub** | <https://github.com/TheHolyOneZ> |
| 🌍 **Developer's other projects** | <https://zsync.eu/> |
| 📜 **License (GPL-3.0)** | <https://www.gnu.org/licenses/gpl-3.0.html> |

---

## 📜 License

ZHashCheck is free software: you can redistribute it and/or modify it under the
terms of the **GNU General Public License** as published by the Free Software
Foundation, either **version 3 of the License, or (at your option) any later
version**.

ZHashCheck is distributed in the hope that it will be useful, but **WITHOUT ANY
WARRANTY**; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
A PARTICULAR PURPOSE. See the [GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html) for more details.

See [LICENSE](./LICENSE) for the full text.

---

<div align="center">

<sub>Made with care by <a href="https://github.com/TheHolyOneZ">TheHolyOneZ</a> · No telemetry · No network · Local-only history</sub>

</div>
