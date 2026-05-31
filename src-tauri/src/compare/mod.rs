// Copyright (c) 2026 TheHolyOneZ


use crate::error::CoreResult;
use crate::hashing::{hash_path, Algo, HashOptions};
use crate::jobs::Job;
use crate::scan::{walk, ScanOpts};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct CompareOpts {
    pub algo: Algo,
    pub follow_symlinks: bool,
    pub include_hidden: bool,
}

impl Default for CompareOpts {
    fn default() -> Self {
        Self {
            algo: Algo::Blake3,
            follow_symlinks: false,
            include_hidden: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct PairedEntry {
    pub rel: String,
    pub size_a: u64,
    pub size_b: u64,
    pub hash_a: Option<String>,
    pub hash_b: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct SoloEntry {
    pub rel: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct CompareReport {
    pub root_a: String,
    pub root_b: String,
    pub algo: Algo,
    pub identical: Vec<PairedEntry>,
    pub differ: Vec<PairedEntry>,
    pub only_a: Vec<SoloEntry>,
    pub only_b: Vec<SoloEntry>,

    pub size_differ: Vec<PairedEntry>,
}

pub fn compare_folders_blocking(
    a: &Path,
    b: &Path,
    opts: &CompareOpts,
    job: &Job,
) -> CoreResult<CompareReport> {
    let scan_opts = ScanOpts {
        follow_symlinks: opts.follow_symlinks,
        include_hidden: opts.include_hidden,
        ..Default::default()
    };
    let files_a = walk(a, &scan_opts);
    let files_b = walk(b, &scan_opts);

    let map_a: HashMap<PathBuf, u64> = files_a
        .into_iter()
        .filter_map(|f| {
            f.path
                .strip_prefix(a)
                .ok()
                .map(|p| (p.to_path_buf(), f.size))
        })
        .collect();
    let map_b: HashMap<PathBuf, u64> = files_b
        .into_iter()
        .filter_map(|f| {
            f.path
                .strip_prefix(b)
                .ok()
                .map(|p| (p.to_path_buf(), f.size))
        })
        .collect();

    let mut only_a: Vec<SoloEntry> = Vec::new();
    let mut only_b: Vec<SoloEntry> = Vec::new();
    let mut size_differ: Vec<PairedEntry> = Vec::new();
    let mut to_hash: Vec<(PathBuf, u64)> = Vec::new();

    for (rel, sz) in &map_a {
        match map_b.get(rel) {
            None => only_a.push(SoloEntry {
                rel: rel.display().to_string(),
                size: *sz,
            }),
            Some(other) if other != sz => size_differ.push(PairedEntry {
                rel: rel.display().to_string(),
                size_a: *sz,
                size_b: *other,
                hash_a: None,
                hash_b: None,
            }),
            Some(_) => to_hash.push((rel.clone(), *sz)),
        }
    }
    for (rel, sz) in &map_b {
        if !map_a.contains_key(rel) {
            only_b.push(SoloEntry {
                rel: rel.display().to_string(),
                size: *sz,
            });
        }
    }


    let total_bytes: u64 = to_hash.iter().map(|(_, s)| *s).sum::<u64>() * 2;
    job.bytes_total.store(total_bytes, Ordering::Relaxed);
    job.files_total
        .store((to_hash.len() as u64) * 2, Ordering::Relaxed);

    let cancel = job.cancel.clone();
    let bd = job.bytes_done.clone();
    let fd = job.files_done.clone();

    let paired: Vec<PairedEntry> = to_hash
        .par_iter()
        .map(|(rel, sz)| {
            let path_a = a.join(rel);
            let path_b = b.join(rel);
            let opts_a = HashOptions {
                algos: vec![opts.algo],
                cancel: cancel.clone(),
                allow_mmap: true,
            };
            let opts_b = opts_a.clone();
            let ha = hash_path(&path_a, &opts_a, None)
                .ok()
                .and_then(|r| r.hashes.get(&opts.algo).cloned());
            fd.fetch_add(1, Ordering::Relaxed);
            bd.fetch_add(*sz, Ordering::Relaxed);
            let hb = hash_path(&path_b, &opts_b, None)
                .ok()
                .and_then(|r| r.hashes.get(&opts.algo).cloned());
            fd.fetch_add(1, Ordering::Relaxed);
            bd.fetch_add(*sz, Ordering::Relaxed);
            PairedEntry {
                rel: rel.display().to_string(),
                size_a: *sz,
                size_b: *sz,
                hash_a: ha,
                hash_b: hb,
            }
        })
        .collect();

    let (identical, differ): (Vec<PairedEntry>, Vec<PairedEntry>) = paired
        .into_iter()
        .partition(|p| matches!((&p.hash_a, &p.hash_b), (Some(a), Some(b)) if a == b));

    Ok(CompareReport {
        root_a: a.display().to_string(),
        root_b: b.display().to_string(),
        algo: opts.algo,
        identical,
        differ,
        only_a,
        only_b,
        size_differ,
    })
}
