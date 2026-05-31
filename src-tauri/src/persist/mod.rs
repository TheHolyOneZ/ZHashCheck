// Copyright (c) 2026 TheHolyOneZ


use crate::commands::settings::Settings;
use crate::error::{CoreError, CoreResult};
use crate::hashing::Algo;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::sync::OnceCell;
use ts_rs::TS;

pub const DB_URL: &str = "sqlite:zhashcheck.db";

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: i64,
    pub path: String,
    pub bytes: u64,
    pub created_at: i64,
    pub hashes: BTreeMap<Algo, String>,
    pub pinned: bool,
}

static INIT: OnceCell<()> = OnceCell::const_new();

async fn db_path(app: &AppHandle) -> CoreResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CoreError::msg(format!("app data dir: {e}")))?;
    std::fs::create_dir_all(&dir).map_err(CoreError::from)?;
    Ok(dir.join("zhashcheck.db"))
}


pub async fn init(app: &AppHandle) -> CoreResult<()> {
    INIT.get_or_try_init(|| async {
        let path = db_path(app).await?;
        let conn = rusqlite_open(&path)?;
        conn.execute_batch(SCHEMA)
            .map_err(|e| CoreError::msg(e.to_string()))?;
        Ok::<_, CoreError>(())
    })
    .await?;
    Ok(())
}

pub async fn record_hash(
    app: &AppHandle,
    path: &str,
    bytes: u64,
    hashes: &BTreeMap<Algo, String>,
) -> CoreResult<()> {
    init(app).await?;
    let path_owned = path.to_string();
    let hashes_json = serde_json::to_string(hashes).map_err(|e| CoreError::msg(e.to_string()))?;
    let dbp = db_path(app).await?;
    tokio::task::spawn_blocking(move || -> CoreResult<()> {
        let conn = rusqlite_open(&dbp)?;
        conn.execute(
            "INSERT INTO history(path, bytes, hashes, created_at, pinned)\
             VALUES(?1, ?2, ?3, strftime('%s','now'), 0)",
            rusqlite::params![path_owned, bytes as i64, hashes_json],
        )
        .map_err(|e| CoreError::msg(e.to_string()))?;
        Ok(())
    })
    .await
    .map_err(|e| CoreError::msg(e.to_string()))??;
    Ok(())
}

pub async fn list_history(
    app: &AppHandle,
    limit: u32,
    offset: u32,
) -> CoreResult<Vec<HistoryEntry>> {
    init(app).await?;
    let dbp = db_path(app).await?;
    tokio::task::spawn_blocking(move || -> CoreResult<Vec<HistoryEntry>> {
        let conn = rusqlite_open(&dbp)?;
        let mut stmt = conn
            .prepare(
                "SELECT id, path, bytes, hashes, created_at, pinned \
                 FROM history ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| CoreError::msg(e.to_string()))?;
        let rows = stmt
            .query_map(rusqlite::params![limit as i64, offset as i64], |r| {
                let hashes_json: String = r.get(3)?;
                let hashes: BTreeMap<Algo, String> =
                    serde_json::from_str(&hashes_json).unwrap_or_default();
                let bytes: i64 = r.get(2)?;
                let pinned: i64 = r.get(5)?;
                Ok(HistoryEntry {
                    id: r.get(0)?,
                    path: r.get(1)?,
                    bytes: bytes.max(0) as u64,
                    hashes,
                    created_at: r.get(4)?,
                    pinned: pinned != 0,
                })
            })
            .map_err(|e| CoreError::msg(e.to_string()))?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row.map_err(|e| CoreError::msg(e.to_string()))?);
        }
        Ok(out)
    })
    .await
    .map_err(|e| CoreError::msg(e.to_string()))?
}

pub async fn clear_history(app: &AppHandle) -> CoreResult<()> {
    init(app).await?;
    let dbp = db_path(app).await?;
    tokio::task::spawn_blocking(move || -> CoreResult<()> {
        let conn = rusqlite_open(&dbp)?;
        conn.execute("DELETE FROM history", [])
            .map_err(|e| CoreError::msg(e.to_string()))?;
        Ok(())
    })
    .await
    .map_err(|e| CoreError::msg(e.to_string()))?
}

pub async fn load_settings(app: &AppHandle) -> CoreResult<Settings> {
    init(app).await?;
    let dbp = db_path(app).await?;
    let json: Option<String> =
        tokio::task::spawn_blocking(move || -> CoreResult<Option<String>> {
            let conn = rusqlite_open(&dbp)?;
            let mut stmt = conn
                .prepare("SELECT value FROM settings WHERE key = 'app'")
                .map_err(|e| CoreError::msg(e.to_string()))?;
            let row: Option<String> = stmt.query_row([], |r| r.get(0)).ok();
            Ok(row)
        })
        .await
        .map_err(|e| CoreError::msg(e.to_string()))??;

    Ok(match json {
        Some(s) => serde_json::from_str(&s).unwrap_or_default(),
        None => Settings::default(),
    })
}

pub async fn save_settings(app: &AppHandle, settings: &Settings) -> CoreResult<()> {
    init(app).await?;
    let json = serde_json::to_string(settings).map_err(|e| CoreError::msg(e.to_string()))?;
    let dbp = db_path(app).await?;
    tokio::task::spawn_blocking(move || -> CoreResult<()> {
        let conn = rusqlite_open(&dbp)?;
        conn.execute(
            "INSERT INTO settings(key, value) VALUES('app', ?1)\
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            rusqlite::params![json],
        )
        .map_err(|e| CoreError::msg(e.to_string()))?;
        Ok(())
    })
    .await
    .map_err(|e| CoreError::msg(e.to_string()))??;
    Ok(())
}


fn rusqlite_open(path: &std::path::Path) -> CoreResult<rusqlite::Connection> {
    rusqlite::Connection::open(path).map_err(|e| CoreError::msg(e.to_string()))
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT    NOT NULL,
  bytes       INTEGER NOT NULL,
  hashes      TEXT    NOT NULL,      -- json: { 'sha256': 'hex', ... }
  created_at  INTEGER NOT NULL,
  pinned      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS history_created_at ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS history_path        ON history(path);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
";
