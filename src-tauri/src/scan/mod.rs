// Copyright (c) 2026 TheHolyOneZ


use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Default)]
pub struct ScanOpts {
    pub follow_symlinks: bool,
    pub include_hidden: bool,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct ScannedFile {
    pub path: PathBuf,
    pub size: u64,
}

pub fn walk(root: &Path, opts: &ScanOpts) -> Vec<ScannedFile> {
    let mut out = Vec::new();
    let walker = WalkDir::new(root).follow_links(opts.follow_symlinks);
    for entry in walker.into_iter().filter_entry(|e| {
        if !opts.include_hidden && is_hidden(e.file_name()) && e.depth() > 0 {
            return false;
        }
        true
    }) {
        let Ok(entry) = entry else { continue };
        if !entry.file_type().is_file() {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        let size = meta.len();
        if let Some(min) = opts.min_size {
            if size < min {
                continue;
            }
        }
        if let Some(max) = opts.max_size {
            if size > max {
                continue;
            }
        }
        out.push(ScannedFile {
            path: entry.into_path(),
            size,
        });
    }
    out
}

fn is_hidden(name: &std::ffi::OsStr) -> bool {
    name.to_str().map(|s| s.starts_with('.')).unwrap_or(false)
}
