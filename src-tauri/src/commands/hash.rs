// Copyright (c) 2026 TheHolyOneZ


use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;

use crate::error::{AppError, CmdResult};
use crate::hashing::{hash_path, Algo, HashOptions, ProgressCb};
use crate::jobs;
use crate::persist;
use crate::scan::{walk, ScanOpts};
use rayon::prelude::*;
use tauri::AppHandle;

#[tauri::command]
pub async fn hash_files(app: AppHandle, paths: Vec<String>, algos: Vec<Algo>) -> CmdResult<String> {
    let job = jobs::create();
    let job_id = job.id.0.clone();


    let scan_opts = ScanOpts::default();
    let mut expanded: Vec<PathBuf> = Vec::new();
    for raw in paths {
        let p = PathBuf::from(raw);
        match std::fs::metadata(&p) {
            Ok(meta) if meta.is_dir() => {
                for f in walk(&p, &scan_opts) {
                    expanded.push(f.path);
                }
            }
            Ok(_) => expanded.push(p),

            Err(_) => expanded.push(p),
        }
    }
    let paths = expanded;


    let total_bytes: u64 = paths
        .iter()
        .filter_map(|p| std::fs::metadata(p).ok().map(|m| m.len()))
        .sum();
    job.bytes_total.store(total_bytes, Ordering::Relaxed);
    job.files_total.store(paths.len() as u64, Ordering::Relaxed);

    let algos = if algos.is_empty() {
        vec![Algo::Sha256, Algo::Blake3]
    } else {
        algos
    };

    let app_for_task = app.clone();
    let job_for_task = job.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let cancel = job_for_task.cancel.clone();
        let bytes_done = job_for_task.bytes_done.clone();
        let files_done = job_for_task.files_done.clone();

        paths.par_iter().for_each(|path| {
            if cancel.load(Ordering::Relaxed) {
                return;
            }
            let chunk_start_bytes = Arc::new(std::sync::atomic::AtomicU64::new(0));
            let cs = chunk_start_bytes.clone();
            let bd = bytes_done.clone();
            let cb: ProgressCb = Box::new(move |n_in_file| {
                let prev = cs.swap(n_in_file, Ordering::Relaxed);
                let delta = n_in_file.saturating_sub(prev);
                bd.fetch_add(delta, Ordering::Relaxed);
            });

            let opts = HashOptions {
                algos: algos.clone(),
                cancel: cancel.clone(),
                allow_mmap: true,
            };
            match hash_path(path, &opts, Some(cb)) {
                Ok(out) => {
                    files_done.fetch_add(1, Ordering::Relaxed);
                    let path_str = path.display().to_string();
                    jobs::emit_file_done(&app_for_task, &job_for_task, &path_str, &out);
                    jobs::emit_progress(&app_for_task, &job_for_task, false);


                    let app_for_hist = app_for_task.clone();
                    let hashes_for_hist = out.hashes.clone();
                    let bytes_for_hist = out.bytes;
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = persist::record_hash(
                            &app_for_hist,
                            &path_str,
                            bytes_for_hist,
                            &hashes_for_hist,
                        )
                        .await
                        {
                            tracing::warn!("history record failed: {e}");
                        }
                    });
                }
                Err(e) => {
                    jobs::emit_error(
                        &app_for_task,
                        &job_for_task,
                        Some(&path.display().to_string()),
                        &e.to_string(),
                    );
                }
            }
        });

        jobs::emit_progress(&app_for_task, &job_for_task, true);
        jobs::emit_done(&app_for_task, &job_for_task);
        jobs::finish(&job_for_task.id.0);
    });

    Ok(job_id)
}

#[tauri::command]
pub async fn hash_text(
    text: String,
    algos: Vec<Algo>,
) -> CmdResult<std::collections::BTreeMap<Algo, String>> {
    use crate::hashing::MultiDigest;
    let algos = if algos.is_empty() {
        vec![Algo::Sha256, Algo::Blake3]
    } else {
        algos
    };
    let mut md = MultiDigest::new(&algos);
    md.update(text.as_bytes());
    Ok(md.finalize())
}

#[tauri::command]
pub async fn cancel_job(id: String) -> CmdResult<()> {
    jobs::cancel(&id).map_err(AppError::from)
}
