// Copyright (c) 2026 TheHolyOneZ


use crate::dedup::{find_duplicates_blocking, DedupOpts, DedupReport};
use crate::error::CmdResult;
use crate::jobs;
use std::path::PathBuf;
use tauri::AppHandle;

#[tauri::command]
pub async fn find_duplicates(
    app: AppHandle,
    roots: Vec<String>,
    opts: Option<DedupOpts>,
) -> CmdResult<String> {
    let job = jobs::create();
    let job_id = job.id.0.clone();

    let opts = opts.unwrap_or_default();
    let app_for_task = app.clone();
    let job_for_task = job.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let paths: Vec<PathBuf> = roots.into_iter().map(PathBuf::from).collect();
        let report: DedupReport =
            match find_duplicates_blocking(&paths, &opts, &app_for_task, &job_for_task) {
                Ok(r) => r,
                Err(e) => {
                    jobs::emit_error(&app_for_task, &job_for_task, None, &e.to_string());
                    jobs::finish(&job_for_task.id.0);
                    return;
                }
            };

        #[derive(serde::Serialize, Clone)]
        struct DonePayload {
            id: String,
            report: DedupReport,
        }
        let _ = tauri::Emitter::emit(
            &app_for_task,
            "dedup:report",
            DonePayload {
                id: job_for_task.id.0.clone(),
                report: report.clone(),
            },
        );
        jobs::emit_progress(&app_for_task, &job_for_task, true);
        jobs::emit_done(&app_for_task, &job_for_task);
        jobs::finish(&job_for_task.id.0);
    });

    Ok(job_id)
}
