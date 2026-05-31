// Copyright (c) 2026 TheHolyOneZ


use crate::error::{AppError, CmdResult};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct QaWorkspace {
    pub root: String,
    pub hello_txt: String,
    pub empty_txt: String,
    pub big_txt: String,
    pub dup_a: String,
    pub dup_b: String,
    pub dup_c: String,
    pub unique_in_dup: String,
    pub compare_a: String,
    pub compare_b: String,
    pub checksum_sha256: String,
    pub trash_target: String,
}

fn write_file(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, bytes)
}

fn to_string(p: &Path) -> String {
    p.display().to_string()
}

#[tauri::command]
pub fn qa_setup() -> CmdResult<QaWorkspace> {


    let unique = format!(
        "zhashcheck-qa-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    );
    let root = std::env::temp_dir().join(unique);
    std::fs::create_dir_all(&root).map_err(AppError::from)?;


    let hello_txt = root.join("hello.txt");
    write_file(&hello_txt, b"hello\n").map_err(AppError::from)?;

    let empty_txt = root.join("empty.txt");
    write_file(&empty_txt, b"").map_err(AppError::from)?;

    let big_txt = root.join("big.txt");
    let big_bytes = vec![b'A'; 1024 * 1024];
    write_file(&big_txt, &big_bytes).map_err(AppError::from)?;


    let dup_body: Vec<u8> = b"duplicate content".repeat(100);
    let dup_a = root.join("dup1").join("dup_a.bin");
    let dup_b = root.join("dup2").join("dup_b.bin");
    let dup_c = root.join("dup3").join("dup_c.bin");
    write_file(&dup_a, &dup_body).map_err(AppError::from)?;
    write_file(&dup_b, &dup_body).map_err(AppError::from)?;
    write_file(&dup_c, &dup_body).map_err(AppError::from)?;


    let unique_in_dup = root.join("dup1").join("unique.bin");
    write_file(
        &unique_in_dup,
        &b"this content is unique in the workspace".repeat(50),
    )
    .map_err(AppError::from)?;


    let compare_a = root.join("compare_a");
    let compare_b = root.join("compare_b");
    write_file(&compare_a.join("same.txt"), b"same").map_err(AppError::from)?;
    write_file(&compare_b.join("same.txt"), b"same").map_err(AppError::from)?;
    write_file(&compare_a.join("differ.txt"), b"version A").map_err(AppError::from)?;
    write_file(&compare_b.join("differ.txt"), b"version B").map_err(AppError::from)?;
    write_file(&compare_a.join("only_a.txt"), b"only A").map_err(AppError::from)?;
    write_file(&compare_b.join("only_b.txt"), b"only B").map_err(AppError::from)?;


    let hello_hex = hex::encode(Sha256::digest(b"hello\n"));
    let empty_hex = hex::encode(Sha256::digest(b""));
    let checksum_sha256 = root.join("SHASUMS.sha256");
    let checksum_body = format!("{hello_hex}  hello.txt\n{empty_hex}  empty.txt\n");
    write_file(&checksum_sha256, checksum_body.as_bytes()).map_err(AppError::from)?;


    let trash_target = root.join("trash_me.bin");
    write_file(&trash_target, b"will be trashed").map_err(AppError::from)?;

    Ok(QaWorkspace {
        root: to_string(&root),
        hello_txt: to_string(&hello_txt),
        empty_txt: to_string(&empty_txt),
        big_txt: to_string(&big_txt),
        dup_a: to_string(&dup_a),
        dup_b: to_string(&dup_b),
        dup_c: to_string(&dup_c),
        unique_in_dup: to_string(&unique_in_dup),
        compare_a: to_string(&compare_a),
        compare_b: to_string(&compare_b),
        checksum_sha256: to_string(&checksum_sha256),
        trash_target: to_string(&trash_target),
    })
}

#[tauri::command]
pub fn qa_cleanup(dir: String) -> CmdResult<()> {
    let p = PathBuf::from(&dir);


    let looks_like_workspace = p
        .file_name()
        .and_then(|n| n.to_str())
        .map(|n| n.starts_with("zhashcheck-qa-"))
        .unwrap_or(false);
    if !looks_like_workspace {
        return Err(AppError {
            kind: "error".into(),
            message: format!("refusing to cleanup non-QA directory: {dir}"),
        });
    }

    let _ = std::fs::remove_dir_all(&p);
    Ok(())
}
