// Copyright (c) 2026 TheHolyOneZ


use crate::error::CmdResult;
use serde::Serialize;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct TrashItemResult {
    pub path: String,
    pub ok: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct TrashReport {
    pub items: Vec<TrashItemResult>,
    pub trashed: u32,
    pub failed: u32,
}

#[tauri::command]
pub async fn move_to_trash(paths: Vec<String>) -> CmdResult<TrashReport> {
    let mut items = Vec::with_capacity(paths.len());
    let mut trashed = 0u32;
    let mut failed = 0u32;
    for p in paths {
        match trash::delete(&p) {
            Ok(()) => {
                trashed += 1;
                items.push(TrashItemResult {
                    path: p,
                    ok: true,
                    error: None,
                });
            }
            Err(e) => {
                failed += 1;
                items.push(TrashItemResult {
                    path: p,
                    ok: false,
                    error: Some(e.to_string()),
                });
            }
        }
    }
    Ok(TrashReport {
        items,
        trashed,
        failed,
    })
}
