use std::collections::HashMap;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Deserialize, Debug, Clone)]
pub struct ShortcutConfig {
    pub hotkey: String,
    pub r#type: String,
    pub target: String,
}

#[derive(Serialize, Debug, Clone)]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub is_primary: bool,
}

pub struct ShortcutStateMap(pub Mutex<HashMap<String, (String, String)>>);

#[tauri::command]
fn get_available_monitors(window: WebviewWindow) -> Result<Vec<MonitorInfo>, String> {
    let available = window.available_monitors().map_err(|e| e.to_string())?;
    let primary = window.primary_monitor().ok().flatten();
    let primary_name = primary.as_ref().and_then(|m| m.name());

    let mut list = Vec::new();
    for (idx, mon) in available.into_iter().enumerate() {
        let raw_name = mon.name().cloned().unwrap_or_else(|| format!("Monitor {}", idx + 1));
        let is_prim = primary_name.as_ref().map_or(idx == 0, |pn| *pn == &raw_name);
        let display_name = if is_prim {
            format!("{} (Principal)", raw_name)
        } else {
            raw_name
        };

        list.push(MonitorInfo {
            index: idx,
            name: display_name,
            is_primary: is_prim,
        });
    }

    Ok(list)
}

fn toggle_drawer_size_impl(
    window: &WebviewWindow,
    open: bool,
    side: Option<String>,
    monitor_index: Option<usize>,
) -> Result<(), String> {
    let available = window.available_monitors().ok();
    let target_monitor = if let (Some(mon_list), Some(idx)) = (&available, monitor_index) {
        mon_list.get(idx).cloned().or_else(|| window.current_monitor().ok().flatten())
    } else {
        window.current_monitor().ok().flatten()
    };

    if let Some(monitor) = target_monitor {
        let scale_factor = monitor.scale_factor();
        let closed_w = (50.0 * scale_factor) as i32;
        let open_w = (330.0 * scale_factor) as i32;
        let height = (640.0 * scale_factor) as u32;

        let side_str = side.unwrap_or_else(|| "right".to_string());
        let is_left = side_str.eq_ignore_ascii_case("left");

        let monitor_size = monitor.size();
        let monitor_pos = monitor.position();
        let screen_right = monitor_pos.x + (monitor_size.width as i32);
        let screen_left = monitor_pos.x;
        
        let current_y = window.outer_position().map(|p| p.y).unwrap_or(monitor_pos.y + 100);

        if is_left {
            if open {
                let _ = window.set_position(PhysicalPosition::new(screen_left, current_y));
                let _ = window.set_size(PhysicalSize::new(open_w as u32, height));
            } else {
                let _ = window.set_size(PhysicalSize::new(closed_w as u32, height));
                let _ = window.set_position(PhysicalPosition::new(screen_left, current_y));
            }
        } else {
            if open {
                let target_x = screen_right - open_w;
                let _ = window.set_position(PhysicalPosition::new(target_x, current_y));
                let _ = window.set_size(PhysicalSize::new(open_w as u32, height));
            } else {
                let target_x = screen_right - closed_w;
                let _ = window.set_size(PhysicalSize::new(closed_w as u32, height));
                let _ = window.set_position(PhysicalPosition::new(target_x, current_y));
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn toggle_drawer_size(
    window: WebviewWindow,
    open: bool,
    side: Option<String>,
    monitor_index: Option<usize>,
) -> Result<(), String> {
    toggle_drawer_size_impl(&window, open, side, monitor_index)
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_local_tool(path: Option<String>) -> Result<(), String> {
    let target = path.unwrap_or_default();
    let target_trim = target.trim();

    if target_trim.is_empty() || target_trim.eq_ignore_ascii_case("cmd.exe") || target_trim.eq_ignore_ascii_case("cmd") {
        std::process::Command::new("cmd.exe")
            .args(["/c", "start", "cmd.exe"])
            .spawn()
            .map_err(|e| format!("Erro ao abrir Prompt de Comando: {}", e))?;
    } else {
        open::that(target_trim)
            .or_else(|_| {
                std::process::Command::new("cmd.exe")
                    .args(["/c", "start", "", target_trim])
                    .spawn()
                    .map(|_| ())
            })
            .map_err(|e| format!("Erro ao executar '{}': {}", target_trim, e))?;
    }

    Ok(())
}

#[tauri::command]
fn update_global_shortcuts(
    app: tauri::AppHandle,
    state: tauri::State<'_, ShortcutStateMap>,
    shortcuts: Vec<ShortcutConfig>,
) -> Result<(), String> {
    let global_shortcut = app.global_shortcut();
    let _ = global_shortcut.unregister_all();

    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    map.clear();

    for sc in shortcuts {
        let hotkey_trim = sc.hotkey.trim();
        if hotkey_trim.is_empty() {
            continue;
        }

        if let Ok(shortcut) = hotkey_trim.parse::<Shortcut>() {
            if global_shortcut.register(shortcut).is_ok() {
                map.insert(shortcut.to_string().to_lowercase(), (sc.r#type, sc.target));
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn read_media_src(path: String) -> Result<String, String> {
    let mut path_clean = path.trim().to_string();
    if (path_clean.starts_with('"') && path_clean.ends_with('"'))
        || (path_clean.starts_with('\'') && path_clean.ends_with('\''))
    {
        if path_clean.len() >= 2 {
            path_clean = path_clean[1..path_clean.len() - 1].trim().to_string();
        }
    }

    if path_clean.starts_with("http://")
        || path_clean.starts_with("https://")
        || path_clean.starts_with("data:")
    {
        return Ok(path_clean);
    }

    let path_buf = std::path::PathBuf::from(&path_clean);
    let resolved = if path_buf.is_absolute() {
        path_buf
    } else {
        let cwd_path = std::env::current_dir().unwrap_or_default().join(&path_buf);
        if cwd_path.exists() {
            cwd_path
        } else if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let exe_relative = exe_dir.join(&path_buf);
                if exe_relative.exists() {
                    exe_relative
                } else {
                    path_buf
                }
            } else {
                path_buf
            }
        } else {
            path_buf
        }
    };

    if !resolved.exists() {
        return Err(format!("Arquivo de mídia não encontrado: '{}'", path_clean));
    }

    let abs_path = std::fs::canonicalize(&resolved)
        .unwrap_or(resolved)
        .to_string_lossy()
        .to_string();

    let final_path = if abs_path.starts_with(r"\\?\") {
        abs_path[4..].to_string()
    } else {
        abs_path
    };

    Ok(final_path)
}

fn get_app_media_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let media_dir = app_dir.join("media");
    if !media_dir.exists() {
        std::fs::create_dir_all(&media_dir).map_err(|e| format!("Erro ao criar pasta media: {}", e))?;
    }
    Ok(media_dir)
}

fn get_shortcuts_file_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).map_err(|e| format!("Erro ao criar pasta de dados: {}", e))?;
    }
    Ok(app_dir.join("shortcuts.json"))
}

#[tauri::command]
fn pick_and_copy_media(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Mídias (MP3, WAV, MP4, etc.)", &["mp3", "wav", "m4a", "ogg", "mp4", "webm", "mov"])
        .set_title("Selecionar Arquivo de Som ou Vídeo")
        .pick_file();

    if let Some(src_path) = file {
        let media_dir = get_app_media_dir(&app)?;
        let file_name = src_path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "media_file".to_string());

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let safe_name = format!("{}_{}", timestamp, file_name);
        let dest_path = media_dir.join(safe_name);

        std::fs::copy(&src_path, &dest_path)
            .map_err(|e| format!("Não foi possível copiar o arquivo para AppData: {}", e))?;

        let final_path = dest_path.to_string_lossy().to_string();
        Ok(Some(final_path))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn pick_app_file() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Aplicativos e Comandos", &["exe", "bat", "cmd", "lnk", "com"])
        .add_filter("Todos os Arquivos", &["*"])
        .set_title("Selecionar Aplicativo ou Ferramenta")
        .pick_file();

    if let Some(path) = file {
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn ensure_media_in_appdata(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let mut path_clean = path.trim().to_string();
    if (path_clean.starts_with('"') && path_clean.ends_with('"'))
        || (path_clean.starts_with('\'') && path_clean.ends_with('\''))
    {
        if path_clean.len() >= 2 {
            path_clean = path_clean[1..path_clean.len() - 1].trim().to_string();
        }
    }

    if path_clean.starts_with("http://") || path_clean.starts_with("https://") || path_clean.starts_with("data:") {
        return Ok(path_clean);
    }

    let src_path = std::path::PathBuf::from(&path_clean);
    if !src_path.exists() {
        return Ok(path_clean);
    }

    let media_dir = get_app_media_dir(&app)?;
    if src_path.starts_with(&media_dir) {
        return Ok(src_path.to_string_lossy().to_string());
    }

    let file_name = src_path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "media_file".to_string());

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let safe_name = format!("{}_{}", timestamp, file_name);
    let dest_path = media_dir.join(safe_name);

    if std::fs::copy(&src_path, &dest_path).is_ok() {
        Ok(dest_path.to_string_lossy().to_string())
    } else {
        Ok(path_clean)
    }
}

#[tauri::command]
fn save_shortcuts_file(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let file_path = get_shortcuts_file_path(&app)?;
    std::fs::write(&file_path, content).map_err(|e| format!("Erro ao salvar arquivo de atalhos: {}", e))?;
    Ok(())
}

#[tauri::command]
fn load_shortcuts_file(app: tauri::AppHandle) -> Result<String, String> {
    let file_path = get_shortcuts_file_path(&app)?;
    if file_path.exists() {
        std::fs::read_to_string(&file_path).map_err(|e| format!("Erro ao ler atalhos: {}", e))
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
fn export_backup_file(content: String) -> Result<bool, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Arquivo JSON de Backup", &["json"])
        .set_file_name("barra_lateral_backup.json")
        .set_title("Exportar Backup dos Atalhos")
        .save_file();

    if let Some(path) = file {
        std::fs::write(&path, content).map_err(|e| format!("Erro ao exportar arquivo de backup: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn import_backup_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Arquivo JSON de Backup", &["json"])
        .set_title("Importar Backup dos Atalhos")
        .pick_file();

    if let Some(path) = file {
        let content = std::fs::read_to_string(&path).map_err(|e| format!("Erro ao ler o arquivo de backup: {}", e))?;
        let file_path = get_shortcuts_file_path(&app)?;
        std::fs::write(&file_path, &content).map_err(|e| format!("Erro ao salvar backup importado: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ShortcutStateMap(Mutex::new(HashMap::new())))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = toggle_drawer_size_impl(&window, true, None, None);
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::AppleScript, Some(vec!["--autostart"])))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let shortcut_key = shortcut.to_string().to_lowercase();
                        if let Some(state) = app.try_state::<ShortcutStateMap>() {
                            if let Ok(map) = state.0.lock() {
                                if let Some((stype, starget)) = map.get(&shortcut_key) {
                                    if stype == "audio" {
                                        if let Some(window) = app.get_webview_window("main") {
                                            let _ = toggle_drawer_size_impl(&window, true, None, None);
                                        }
                                        let _ = app.emit("play-internal-media", starget);
                                    } else if stype == "url" {
                                        let _ = open::that(starget);
                                    } else {
                                        let _ = open_local_tool(Some(starget.clone()));
                                    }
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let toggle_item = MenuItem::with_id(app, "toggle", "Abrir Barra Lateral", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Configurações", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Sair Definitivamente", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_item, &settings_item, &quit_item])?;

            let default_icon = app.default_window_icon();
            let mut tray_builder = TrayIconBuilder::new().menu(&menu);
            if let Some(icon) = default_icon {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_drawer_size_impl(&window, true, None, None);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_drawer_size_impl(&window, true, None, None);
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("open-settings-modal", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = toggle_drawer_size_impl(&window, true, None, None);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();

                if let Ok(Some(monitor)) = window.current_monitor() {
                    let monitor_size = monitor.size();
                    let monitor_pos = monitor.position();
                    let scale_factor = monitor.scale_factor();

                    let win_width = (50.0 * scale_factor) as i32;
                    let win_height = (640.0 * scale_factor) as i32;

                    let target_x = monitor_pos.x + (monitor_size.width as i32) - win_width;
                    let target_y = monitor_pos.y + ((monitor_size.height as i32) - win_height) / 2;

                    let _ = window.set_size(PhysicalSize::new(win_width as u32, win_height as u32));
                    let _ = window.set_position(PhysicalPosition::new(target_x, target_y));
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            toggle_drawer_size,
            get_available_monitors,
            open_url,
            open_local_tool,
            update_global_shortcuts,
            read_media_src,
            pick_and_copy_media,
            pick_app_file,
            ensure_media_in_appdata,
            save_shortcuts_file,
            load_shortcuts_file,
            export_backup_file,
            import_backup_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
