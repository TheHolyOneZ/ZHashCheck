// Copyright (c) 2026 TheHolyOneZ


mod prefilter;

use crate::error::CoreResult;
use crate::hashing::{hash_path, Algo, HashOptions};
use crate::jobs::Job;
use crate::scan::{walk, ScanOpts, ScannedFile};
use prefilter::prefilter_hash;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use tauri::AppHandle;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct DedupOpts {
    pub algo: Algo,
    pub follow_symlinks: bool,
    pub include_hidden: bool,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
}

impl Default for DedupOpts {
    fn default() -> Self {
        Self {
            algo: Algo::Blake3,
            follow_symlinks: false,
            include_hidden: false,
            min_size: Some(1),
            max_size: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct DuplicateFile {
    pub path: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub hash: String,
    pub algo: Algo,
    pub size_each: u64,
    pub files: Vec<DuplicateFile>,

    pub wasted_bytes: u64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct DedupReport {
    pub roots: Vec<String>,
    pub algo: Algo,
    pub groups: Vec<DuplicateGroup>,
    pub total_files_scanned: u64,
    pub total_wasted_bytes: u64,
}

pub fn find_duplicates_blocking(
    roots: &[PathBuf],
    opts: &DedupOpts,
    _app: &AppHandle,
    job: &Job,
) -> CoreResult<DedupReport> {
    let scan_opts = ScanOpts {
        follow_symlinks: opts.follow_symlinks,
        include_hidden: opts.include_hidden,
        min_size: opts.min_size,
        max_size: opts.max_size,
    };

    let mut all: Vec<ScannedFile> = Vec::new();
    for r in roots {
        all.extend(walk(r, &scan_opts));
    }
    let total_scanned = all.len() as u64;
    job.files_total.store(total_scanned, Ordering::Relaxed);


    let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
    for f in all {
        by_size.entry(f.size).or_default().push(f.path);
    }
    by_size.retain(|_, v| v.len() > 1);


    let cancel = job.cancel.clone();
    let prefiltered: Vec<(u64, HashMap<u64, Vec<PathBuf>>)> = by_size
        .into_par_iter()
        .map(|(size, paths)| {
            let mut buckets: HashMap<u64, Vec<PathBuf>> = HashMap::new();
            for p in paths {
                if cancel.load(Ordering::Relaxed) {
                    break;
                }
                let digest = prefilter_hash(&p, size).unwrap_or(0);
                buckets.entry(digest).or_default().push(p);
            }
            buckets.retain(|_, v| v.len() > 1);
            (size, buckets)
        })
        .collect();


    let bd = job.bytes_done.clone();
    let fd = job.files_done.clone();
    let algo = opts.algo;
    let groups_raw: Vec<DuplicateGroup> = prefiltered
        .into_par_iter()
        .flat_map_iter(move |(size, buckets)| {
            let cancel = cancel.clone();
            let bd = bd.clone();
            let fd = fd.clone();
            buckets.into_values().flat_map(move |paths| {
                if cancel.load(Ordering::Relaxed) {
                    return Vec::new();
                }
                let mut by_hash: HashMap<String, Vec<PathBuf>> = HashMap::new();
                for p in paths {
                    if cancel.load(Ordering::Relaxed) {
                        break;
                    }
                    let opts_h = HashOptions {
                        algos: vec![algo],
                        cancel: cancel.clone(),
                        allow_mmap: true,
                    };
                    if let Ok(r) = hash_path(&p, &opts_h, None) {
                        bd.fetch_add(r.bytes, Ordering::Relaxed);
                        fd.fetch_add(1, Ordering::Relaxed);
                        if let Some(h) = r.hashes.get(&algo).cloned() {
                            by_hash.entry(h).or_default().push(p);
                        }
                    }
                }
                by_hash.retain(|_, v| v.len() > 1);
                by_hash
                    .into_iter()
                    .map(move |(hash, files)| {
                        let n = files.len() as u64;
                        DuplicateGroup {
                            hash,
                            algo,
                            size_each: size,
                            wasted_bytes: size * (n - 1),
                            files: files
                                .into_iter()
                                .map(|p| DuplicateFile {
                                    path: p.display().to_string(),
                                    size,
                                })
                                .collect(),
                        }
                    })
                    .collect::<Vec<_>>()
            })
        })
        .collect();

    let mut groups = groups_raw;

    groups.sort_by_key(|g| std::cmp::Reverse(g.wasted_bytes));
    let total_wasted: u64 = groups.iter().map(|g| g.wasted_bytes).sum();

    Ok(DedupReport {
        roots: roots.iter().map(|p| p.display().to_string()).collect(),
        algo: opts.algo,
        groups,
        total_files_scanned: total_scanned,
        total_wasted_bytes: total_wasted,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::Path;

    fn write(dir: &Path, name: &str, body: &[u8]) -> PathBuf {
        let p = dir.join(name);
        let mut f = std::fs::File::create(&p).unwrap();
        f.write_all(body).unwrap();
        p
    }

    #[test]
    fn size_bucket_collapses_singletons() {
        let dir = tempfile::tempdir().unwrap();

        write(dir.path(), "a.bin", b"hello world hello world!");
        write(dir.path(), "b.bin", b"hello world hello world!");
        write(dir.path(), "c.txt", b"short");

        let scan_opts = ScanOpts {
            follow_symlinks: false,
            include_hidden: false,
            min_size: Some(1),
            max_size: None,
        };
        let files = walk(dir.path(), &scan_opts);
        let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
        for f in files {
            by_size.entry(f.size).or_default().push(f.path);
        }
        by_size.retain(|_, v| v.len() > 1);

        assert_eq!(by_size.len(), 1);
        let group = by_size.values().next().unwrap();
        assert_eq!(group.len(), 2);
    }

    #[test]
    fn full_pipeline_groups_identical_files() {
        let dir = tempfile::tempdir().unwrap();
        let body = b"identical bytes for hashing!".repeat(100);
        write(dir.path(), "dup_a.bin", &body);
        write(dir.path(), "dup_b.bin", &body);
        write(dir.path(), "dup_c.bin", &body);
        write(
            dir.path(),
            "other.bin",
            &b"totally different content here.".repeat(100),
        );


        let scan_opts = ScanOpts {
            min_size: Some(1),
            ..ScanOpts::default()
        };
        let files = walk(dir.path(), &scan_opts);
        let mut by_size: HashMap<u64, Vec<PathBuf>> = HashMap::new();
        for f in files {
            by_size.entry(f.size).or_default().push(f.path);
        }
        by_size.retain(|_, v| v.len() > 1);

        assert_eq!(by_size.len(), 1);


        let mut digests = std::collections::HashSet::new();
        for paths in by_size.values() {
            for p in paths {
                let opts = HashOptions {
                    algos: vec![Algo::Blake3],
                    ..Default::default()
                };
                let r = hash_path(p, &opts, None).unwrap();
                digests.insert(r.hashes[&Algo::Blake3].clone());
            }
        }
        assert_eq!(digests.len(), 1, "all dup files must hash identically");
    }
}
