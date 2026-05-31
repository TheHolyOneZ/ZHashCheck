// Copyright (c) 2026 TheHolyOneZ


mod checksum_file;

pub use checksum_file::{parse_checksum_file, ChecksumEntry, ChecksumKind};

use crate::error::{CoreError, CoreResult};
use crate::hashing::{hash_path, Algo, HashOptions};
use serde::Serialize;
use std::path::Path;
use subtle::ConstantTimeEq;
use ts_rs::TS;

#[derive(Debug, Copy, Clone, Serialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "lowercase")]
pub enum VerifyOutcome {
    Pass,
    Fail,
    Missing,
}


pub fn verify_file_against_hash(
    path: &Path,
    expected: &str,
    algo: Option<Algo>,
) -> CoreResult<(Algo, VerifyOutcome, String)> {
    let expected_norm = expected.trim().to_ascii_lowercase();
    if expected_norm.is_empty() {
        return Err(CoreError::msg("empty expected hash"));
    }

    hex::decode(&expected_norm).map_err(CoreError::from)?;

    let candidates: Vec<Algo> = match algo {
        Some(a) => vec![a],
        None => {
            let by_len = Algo::from_hex_len(expected_norm.len());
            if by_len.is_empty() {
                return Err(CoreError::msg(format!(
                    "unrecognized hash length: {} hex chars",
                    expected_norm.len()
                )));
            }
            by_len
        }
    };

    let opts = HashOptions {
        algos: candidates.clone(),
        ..Default::default()
    };
    let result = hash_path(path, &opts, None)?;

    for a in &candidates {
        if let Some(got) = result.hashes.get(a) {
            let eq = got.as_bytes().ct_eq(expected_norm.as_bytes());
            if bool::from(eq) {
                return Ok((*a, VerifyOutcome::Pass, got.clone()));
            }
        }
    }

    let first = candidates.first().copied().unwrap_or(Algo::Sha256);
    let computed = result.hashes.get(&first).cloned().unwrap_or_default();
    Ok((first, VerifyOutcome::Fail, computed))
}
