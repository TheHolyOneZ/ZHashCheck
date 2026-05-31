// Copyright (c) 2026 TheHolyOneZ


use crate::error::CmdResult;
use crate::hashing::Algo;
use crate::verify::{
    parse_checksum_file, verify_file_against_hash, ChecksumEntry, ChecksumKind, VerifyOutcome,
};
use serde::Serialize;
use std::path::PathBuf;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct PasteVerify {
    pub algo: Algo,
    pub outcome: VerifyOutcome,
    pub computed: String,
    pub expected: String,
}

#[tauri::command]
pub async fn verify_paste(
    path: String,
    hash: String,
    algo: Option<Algo>,
) -> CmdResult<PasteVerify> {
    let p = PathBuf::from(&path);
    let (algo, outcome, computed) = verify_file_against_hash(&p, &hash, algo)?;
    Ok(PasteVerify {
        algo,
        outcome,
        computed,
        expected: hash,
    })
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct ChecksumFileReport {
    pub kind: ChecksumKind,
    pub entries: Vec<ChecksumEntryResult>,
    pub passed: u32,
    pub failed: u32,
    pub missing: u32,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct ChecksumEntryResult {
    pub path: String,
    pub algo: Algo,
    pub expected: String,
    pub outcome: VerifyOutcome,
    pub computed: Option<String>,
}

#[tauri::command]
pub async fn verify_checksum_file(
    checksum_path: String,
    root_dir: Option<String>,
) -> CmdResult<ChecksumFileReport> {
    let cs_path = PathBuf::from(&checksum_path);
    let content = std::fs::read_to_string(&cs_path)?;
    let (kind, entries) =
        parse_checksum_file(&content, cs_path.extension().and_then(|s| s.to_str()))?;
    let root = match root_dir {
        Some(r) => PathBuf::from(r),
        None => cs_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_default(),
    };

    let mut results = Vec::with_capacity(entries.len());
    let mut passed = 0u32;
    let mut failed = 0u32;
    let mut missing = 0u32;
    for ChecksumEntry { path, algo, hex } in entries {
        let full = root.join(&path);
        if !full.exists() {
            missing += 1;
            results.push(ChecksumEntryResult {
                path,
                algo,
                expected: hex,
                outcome: VerifyOutcome::Missing,
                computed: None,
            });
            continue;
        }
        match verify_file_against_hash(&full, &hex, Some(algo)) {
            Ok((_, outcome, computed)) => {
                match outcome {
                    VerifyOutcome::Pass => passed += 1,
                    VerifyOutcome::Fail => failed += 1,
                    VerifyOutcome::Missing => missing += 1,
                }
                results.push(ChecksumEntryResult {
                    path,
                    algo,
                    expected: hex,
                    outcome,
                    computed: Some(computed),
                });
            }
            Err(e) => {
                failed += 1;
                results.push(ChecksumEntryResult {
                    path,
                    algo,
                    expected: hex,
                    outcome: VerifyOutcome::Fail,
                    computed: Some(format!("error: {e}")),
                });
            }
        }
    }

    Ok(ChecksumFileReport {
        kind,
        entries: results,
        passed,
        failed,
        missing,
    })
}
