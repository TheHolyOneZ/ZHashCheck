// Copyright (c) 2026 TheHolyOneZ


use std::process::Command;

fn is_safe_http_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://")) {
        return false;
    }

    !url.chars().any(|c| c.is_control() || c == '"' || c == '\'')
}

#[cfg(target_os = "linux")]
fn open_on_linux(url: &str) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("xdg-open failed: {e}"))
}

#[cfg(target_os = "macos")]
fn open_on_macos(url: &str) -> Result<(), String> {
    Command::new("open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("open failed: {e}"))
}

#[cfg(target_os = "windows")]
fn open_on_windows(url: &str) -> Result<(), String> {


    Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("start failed: {e}"))
}

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    if !is_safe_http_url(&url) {
        return Err("Refused to open: only http(s) URLs are allowed".into());
    }
    #[cfg(target_os = "linux")]
    {
        open_on_linux(&url)
    }
    #[cfg(target_os = "macos")]
    {
        open_on_macos(&url)
    }
    #[cfg(target_os = "windows")]
    {
        open_on_windows(&url)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Err("Unsupported OS for opening URLs".into())
    }
}
