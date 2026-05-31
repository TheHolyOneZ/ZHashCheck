// Copyright (c) 2026 TheHolyOneZ


use crate::compare::{compare_folders_blocking, CompareOpts, CompareReport};
use crate::error::CmdResult;
use crate::jobs;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use tauri::AppHandle;

#[tauri::command]
pub async fn compare_folders(
    app: AppHandle,
    a: String,
    b: String,
    opts: Option<CompareOpts>,
) -> CmdResult<String> {
    let job = jobs::create();
    let job_id = job.id.0.clone();

    let opts = opts.unwrap_or_default();
    let app_for_task = app.clone();
    let job_for_task = job.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let report: CompareReport = match compare_folders_blocking(
            &PathBuf::from(a),
            &PathBuf::from(b),
            &opts,
            &job_for_task,
        ) {
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
            report: CompareReport,
        }
        let _ = tauri::Emitter::emit(
            &app_for_task,
            "compare:report",
            DonePayload {
                id: job_for_task.id.0.clone(),
                report: report.clone(),
            },
        );
        job_for_task.files_done.store(
            (report.identical.len()
                + report.differ.len()
                + report.only_a.len()
                + report.only_b.len()) as u64,
            Ordering::Relaxed,
        );
        jobs::emit_progress(&app_for_task, &job_for_task, true);
        jobs::emit_done(&app_for_task, &job_for_task);
        jobs::finish(&job_for_task.id.0);
    });

    Ok(job_id)
}
