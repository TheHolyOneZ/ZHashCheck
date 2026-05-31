// Copyright (c) 2026 TheHolyOneZ


use crate::error::CoreError;
use dashmap::DashMap;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
pub struct JobId(pub String);

impl JobId {
    pub fn new() -> Self {
        Self(Uuid::new_v4().to_string())
    }
}

impl Default for JobId {
    fn default() -> Self {
        Self::new()
    }
}

impl AsRef<str> for JobId {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

pub struct Job {
    pub id: JobId,
    pub cancel: Arc<AtomicBool>,
    pub bytes_done: Arc<AtomicU64>,
    pub bytes_total: Arc<AtomicU64>,
    pub files_done: Arc<AtomicU64>,
    pub files_total: Arc<AtomicU64>,
    pub started: Instant,
    pub last_emit: Mutex<Instant>,
}

impl Job {
    pub fn new(id: JobId) -> Self {
        Self {
            id,
            cancel: Arc::new(AtomicBool::new(false)),
            bytes_done: Arc::new(AtomicU64::new(0)),
            bytes_total: Arc::new(AtomicU64::new(0)),
            files_done: Arc::new(AtomicU64::new(0)),
            files_total: Arc::new(AtomicU64::new(0)),
            started: Instant::now(),
            last_emit: Mutex::new(Instant::now() - Duration::from_secs(1)),
        }
    }
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct JobProgress {
    pub id: String,
    pub files_done: u64,
    pub files_total: u64,
    pub bytes_done: u64,
    pub bytes_total: u64,
    pub throughput_bps: u64,
    pub eta_s: Option<u64>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct JobError {
    pub id: String,
    pub path: Option<String>,
    pub message: String,
}


pub static REGISTRY: Lazy<DashMap<String, Arc<Job>>> = Lazy::new(DashMap::new);

pub fn create() -> Arc<Job> {
    let job = Arc::new(Job::new(JobId::new()));
    REGISTRY.insert(job.id.0.clone(), job.clone());
    job
}

pub fn finish(id: &str) {
    REGISTRY.remove(id);
}

pub fn cancel(id: &str) -> Result<(), CoreError> {
    let job = REGISTRY
        .get(id)
        .ok_or_else(|| CoreError::JobNotFound(id.into()))?;
    job.cancel.store(true, Ordering::Relaxed);
    Ok(())
}


pub fn emit_progress(app: &AppHandle, job: &Job, force: bool) {
    let now = Instant::now();
    {
        let mut last = job.last_emit.lock();
        if !force && now.duration_since(*last) < Duration::from_millis(100) {
            return;
        }
        *last = now;
    }

    let bd = job.bytes_done.load(Ordering::Relaxed);
    let bt = job.bytes_total.load(Ordering::Relaxed);
    let elapsed = now.duration_since(job.started).as_secs_f64().max(0.001);
    let thr = (bd as f64 / elapsed) as u64;
    let eta = if bt > bd && thr > 0 {
        Some(((bt - bd) as f64 / thr as f64) as u64)
    } else {
        None
    };

    let payload = JobProgress {
        id: job.id.0.clone(),
        files_done: job.files_done.load(Ordering::Relaxed),
        files_total: job.files_total.load(Ordering::Relaxed),
        bytes_done: bd,
        bytes_total: bt,
        throughput_bps: thr,
        eta_s: eta,
    };
    let _ = app.emit("job:progress", payload);
}

pub fn emit_file_done(app: &AppHandle, job: &Job, path: &str, hashes: &crate::hashing::FileHashes) {
    #[derive(Serialize)]
    struct Payload<'a> {
        id: &'a str,
        path: &'a str,
        hashes: &'a std::collections::BTreeMap<crate::hashing::Algo, String>,
        bytes: u64,
        #[serde(rename = "tookMs")]
        took_ms: u64,
    }
    let p = Payload {
        id: &job.id.0,
        path,
        hashes: &hashes.hashes,
        bytes: hashes.bytes,
        took_ms: hashes.took_ms,
    };
    let _ = app.emit("job:file_done", &p);
}

pub fn emit_error(app: &AppHandle, job: &Job, path: Option<&str>, message: &str) {
    let payload = JobError {
        id: job.id.0.clone(),
        path: path.map(|s| s.to_string()),
        message: message.to_string(),
    };
    let _ = app.emit("job:error", payload);
}

pub fn emit_done(app: &AppHandle, job: &Job) {
    #[derive(Serialize)]
    struct Done<'a> {
        id: &'a str,
        #[serde(rename = "filesDone")]
        files_done: u64,
        #[serde(rename = "bytesDone")]
        bytes_done: u64,
        #[serde(rename = "tookMs")]
        took_ms: u64,
    }
    let payload = Done {
        id: &job.id.0,
        files_done: job.files_done.load(Ordering::Relaxed),
        bytes_done: job.bytes_done.load(Ordering::Relaxed),
        took_ms: job.started.elapsed().as_millis() as u64,
    };
    let _ = app.emit("job:done", &payload);
}
