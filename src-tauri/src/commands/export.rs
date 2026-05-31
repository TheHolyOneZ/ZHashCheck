// Copyright (c) 2026 TheHolyOneZ


use crate::error::CmdResult;
use crate::hashing::Algo;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct ExportEntry {
    pub path: String,


    #[ts(type = "number")]
    pub bytes: u64,
    pub hashes: std::collections::BTreeMap<Algo, String>,
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "kebab-case")]
pub enum ExportFormat {

    Sha256sum,
    Json,
    Csv,
    Markdown,
}

#[tauri::command]
pub async fn export_results(
    entries: Vec<ExportEntry>,
    format: ExportFormat,
    algo: Option<Algo>,
) -> CmdResult<String> {
    Ok(match format {
        ExportFormat::Sha256sum => {
            let a = algo.unwrap_or(Algo::Sha256);
            let mut out = String::new();
            for e in &entries {
                if let Some(h) = e.hashes.get(&a) {
                    out.push_str(h);
                    out.push_str("  ");
                    out.push_str(&e.path);
                    out.push('\n');
                }
            }
            out
        }
        ExportFormat::Json => serde_json::to_string_pretty(&entries)
            .unwrap_or_else(|e| format!("{{\"error\":\"{e}\"}}")),
        ExportFormat::Csv => {
            let mut algos: std::collections::BTreeSet<Algo> = std::collections::BTreeSet::new();
            for e in &entries {
                for a in e.hashes.keys() {
                    algos.insert(*a);
                }
            }
            let mut out = String::from("path,bytes");
            for a in &algos {
                out.push(',');
                out.push_str(&format!("{:?}", a));
            }
            out.push('\n');
            for e in &entries {
                out.push_str(&csv_escape(&e.path));
                out.push(',');
                out.push_str(&e.bytes.to_string());
                for a in &algos {
                    out.push(',');
                    out.push_str(e.hashes.get(a).map(String::as_str).unwrap_or(""));
                }
                out.push('\n');
            }
            out
        }
        ExportFormat::Markdown => {
            let mut algos: std::collections::BTreeSet<Algo> = std::collections::BTreeSet::new();
            for e in &entries {
                for a in e.hashes.keys() {
                    algos.insert(*a);
                }
            }
            let mut out = String::from("| Path | Bytes |");
            for a in &algos {
                out.push_str(&format!(" {} |", a.display()));
            }
            out.push('\n');
            out.push('|');
            for _ in 0..(2 + algos.len()) {
                out.push_str("---|");
            }
            out.push('\n');
            for e in &entries {
                out.push_str(&format!("| {} | {} |", e.path, e.bytes));
                for a in &algos {
                    out.push_str(&format!(
                        " {} |",
                        e.hashes.get(a).map(String::as_str).unwrap_or("")
                    ));
                }
                out.push('\n');
            }
            out
        }
    })
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        let inner = s.replace('"', "\"\"");
        format!("\"{}\"", inner)
    } else {
        s.to_string()
    }
}
