// Copyright (c) 2026 TheHolyOneZ


use crate::error::CmdResult;
use crate::hashing::Algo;
use crate::persist;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub default_algos: Vec<Algo>,
    pub theme: String,
    pub density: String,
    pub thread_count: Option<u32>,
    pub follow_symlinks: bool,
    pub include_hidden: bool,
    pub history_retention_days: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            default_algos: vec![Algo::Sha256, Algo::Blake3],
            theme: "system".into(),
            density: "comfortable".into(),
            thread_count: None,
            follow_symlinks: false,
            include_hidden: false,
            history_retention_days: 90,
        }
    }
}

#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> CmdResult<Settings> {
    Ok(persist::load_settings(&app).await.unwrap_or_default())
}

#[tauri::command]
pub async fn set_settings(app: tauri::AppHandle, settings: Settings) -> CmdResult<()> {
    persist::save_settings(&app, &settings).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_history(
    app: tauri::AppHandle,
    limit: u32,
    offset: u32,
) -> CmdResult<Vec<persist::HistoryEntry>> {
    Ok(persist::list_history(&app, limit, offset).await?)
}

#[tauri::command]
pub async fn clear_history(app: tauri::AppHandle) -> CmdResult<()> {
    persist::clear_history(&app).await?;
    Ok(())
}
