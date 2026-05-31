// Copyright (c) 2026 TheHolyOneZ


pub mod commands;
pub mod compare;
pub mod dedup;
pub mod error;
pub mod hashing;
pub mod jobs;
pub mod persist;
pub mod scan;
pub mod trash_log;
pub mod verify;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("zhashcheck=info,warn")),
        )
        .try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
            use tauri::{Emitter, Manager};

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = persist::init(&handle).await {
                    tracing::warn!("persistence init failed: {e}");
                }
            });


            let h = app.handle();
            let file_open =
                MenuItem::with_id(h, "file.open", "Open files…", true, Some("CmdOrCtrl+O"))?;
            let file_open_folder = MenuItem::with_id(
                h,
                "file.open_folder",
                "Open folder…",
                true,
                Some("CmdOrCtrl+Shift+O"),
            )?;


            #[cfg(target_os = "macos")]
            let file_menu = Submenu::with_items(h, "File", true, &[&file_open, &file_open_folder])?;
            #[cfg(not(target_os = "macos"))]
            let file_menu = {
                let file_quit = PredefinedMenuItem::quit(h, Some("Quit"))?;
                Submenu::with_items(
                    h,
                    "File",
                    true,
                    &[
                        &file_open,
                        &file_open_folder,
                        &PredefinedMenuItem::separator(h)?,
                        &file_quit,
                    ],
                )?
            };

            let edit_menu = Submenu::with_items(
                h,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(h, None)?,
                    &PredefinedMenuItem::redo(h, None)?,
                    &PredefinedMenuItem::separator(h)?,
                    &PredefinedMenuItem::cut(h, None)?,
                    &PredefinedMenuItem::copy(h, None)?,
                    &PredefinedMenuItem::paste(h, None)?,
                    &PredefinedMenuItem::select_all(h, None)?,
                ],
            )?;

            let view_hash = MenuItem::with_id(h, "view.hash", "Hash", true, Some("CmdOrCtrl+1"))?;
            let view_verify =
                MenuItem::with_id(h, "view.verify", "Verify", true, Some("CmdOrCtrl+2"))?;
            let view_compare =
                MenuItem::with_id(h, "view.compare", "Compare", true, Some("CmdOrCtrl+3"))?;
            let view_dup = MenuItem::with_id(
                h,
                "view.duplicates",
                "Duplicates",
                true,
                Some("CmdOrCtrl+4"),
            )?;
            let view_history =
                MenuItem::with_id(h, "view.history", "History", true, Some("CmdOrCtrl+5"))?;
            let view_settings =
                MenuItem::with_id(h, "view.settings", "Settings", true, Some("CmdOrCtrl+6"))?;
            let view_qa = MenuItem::with_id(h, "view.qa", "QA", true, Some("CmdOrCtrl+7"))?;
            let view_menu = Submenu::with_items(
                h,
                "View",
                true,
                &[
                    &view_hash,
                    &view_verify,
                    &view_compare,
                    &view_dup,
                    &view_history,
                    &PredefinedMenuItem::separator(h)?,
                    &view_settings,
                    &view_qa,
                ],
            )?;

            let help_about =
                MenuItem::with_id(h, "help.about", "About ZHashCheck", true, None::<&str>)?;
            let help_palette = MenuItem::with_id(
                h,
                "help.palette",
                "Command palette",
                true,
                Some("CmdOrCtrl+K"),
            )?;

            #[cfg(target_os = "macos")]
            let menu = {

                let app_menu = Submenu::with_items(
                    h,
                    "ZHashCheck",
                    true,
                    &[
                        &help_about,
                        &PredefinedMenuItem::separator(h)?,
                        &PredefinedMenuItem::services(h, None)?,
                        &PredefinedMenuItem::separator(h)?,
                        &PredefinedMenuItem::hide(h, None)?,
                        &PredefinedMenuItem::hide_others(h, None)?,
                        &PredefinedMenuItem::show_all(h, None)?,
                        &PredefinedMenuItem::separator(h)?,
                        &PredefinedMenuItem::quit(h, Some("Quit ZHashCheck"))?,
                    ],
                )?;
                let help_menu = Submenu::with_items(h, "Help", true, &[&help_palette])?;
                Menu::with_items(
                    h,
                    &[&app_menu, &file_menu, &edit_menu, &view_menu, &help_menu],
                )?
            };
            #[cfg(not(target_os = "macos"))]
            let menu = {
                let help_menu =
                    Submenu::with_items(h, "Help", true, &[&help_palette, &help_about])?;
                Menu::with_items(h, &[&file_menu, &edit_menu, &view_menu, &help_menu])?
            };
            app.set_menu(menu)?;

            app.on_menu_event(move |app, ev| {
                let id = ev.id().0.as_str();
                let event = match id {
                    "view.hash" => Some(("menu:view", "hash")),
                    "view.verify" => Some(("menu:view", "verify")),
                    "view.compare" => Some(("menu:view", "compare")),
                    "view.duplicates" => Some(("menu:view", "duplicates")),
                    "view.history" => Some(("menu:view", "history")),
                    "view.settings" => Some(("menu:view", "settings")),
                    "view.qa" => Some(("menu:view", "qa")),
                    "file.open" => Some(("menu:action", "open_files")),
                    "file.open_folder" => Some(("menu:action", "open_folder")),
                    "help.palette" => Some(("menu:action", "palette")),
                    "help.about" => Some(("menu:action", "about")),
                    _ => None,
                };
                if let Some((name, payload)) = event {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.emit(name, payload);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::hash::hash_files,
            commands::hash::hash_text,
            commands::hash::cancel_job,
            commands::verify::verify_paste,
            commands::verify::verify_checksum_file,
            commands::compare::compare_folders,
            commands::dedup::find_duplicates,
            commands::trash::move_to_trash,
            commands::export::export_results,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::settings::get_history,
            commands::settings::clear_history,
            commands::qa::qa_setup,
            commands::qa::qa_cleanup,
            commands::external::open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ZHashCheck");
}
