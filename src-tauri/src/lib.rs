use std::collections::HashMap;
use std::sync::Mutex;
use serde::Deserialize;
use base64::Engine;
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Deserialize, Debug, Clone)]
pub struct ShortcutConfig {
    pub hotkey: String,
    pub r#type: String,
    pub target: String,
}

pub struct ShortcutStateMap(pub Mutex<HashMap<String, (String, String)>>);

fn toggle_drawer_size_impl(window: &WebviewWindow, open: bool) -> Result<(), String> {
    let scale_factor = window.scale_factor().map_err(|e| e.to_string())?;
    
    let closed_w = (50.0 * scale_factor) as i32;
    let open_w = (330.0 * scale_factor) as i32;
    let height = (640.0 * scale_factor) as u32;

    if let Ok(Some(monitor)) = window.current_monitor() {
        let monitor_size = monitor.size();
        let monitor_pos = monitor.position();
        let screen_right = monitor_pos.x + (monitor_size.width as i32);
        
        let current_y = window.outer_position().map(|p| p.y).unwrap_or(monitor_pos.y + 100);

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

    Ok(())
}

#[tauri::command]
fn toggle_drawer_size(window: WebviewWindow, open: bool) -> Result<(), String> {
    toggle_drawer_size_impl(&window, open)
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
    let path_trim = path.trim();
    if path_trim.starts_with("http://") || path_trim.starts_with("https://") || path_trim.starts_with("data:") {
        return Ok(path_trim.to_string());
    }

    let bytes = std::fs::read(path_trim)
        .map_err(|e| format!("Não foi possível ler o arquivo '{}': {}", path_trim, e))?;

    let lower = path_trim.to_lowercase();
    let mime = if lower.ends_with(".mp3") {
        "audio/mpeg"
    } else if lower.ends_with(".wav") {
        "audio/wav"
    } else if lower.ends_with(".m4a") {
        "audio/m4a"
    } else if lower.ends_with(".ogg") {
        "audio/ogg"
    } else if lower.ends_with(".webm") {
        "video/webm"
    } else if lower.ends_with(".mov") {
        "video/quicktime"
    } else {
        "video/mp4"
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ShortcutStateMap(Mutex::new(HashMap::new())))
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
                                            let _ = toggle_drawer_size_impl(&window, true);
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
        .invoke_handler(tauri::generate_handler![
            toggle_drawer_size,
            open_url,
            open_local_tool,
            update_global_shortcuts,
            read_media_src
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
