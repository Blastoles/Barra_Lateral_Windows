const DEFAULT_SHORTCUTS = [
  { id: '1', title: 'GitHub Blastoles', sub: 'Repositórios & Código Aberto', type: 'url', target: 'https://github.com/Blastoles', icon: 'github', hotkey: '' },
  { id: '2', title: 'PowerShell', sub: 'Windows PowerShell', type: 'app', target: 'powershell.exe', icon: 'terminal', hotkey: 'Alt+1' },
  { id: '3', title: 'Prompt de Comando', sub: 'Terminal cmd.exe', type: 'app', target: 'cmd.exe', icon: 'terminal', hotkey: 'Alt+2' }
];

let activeAudio = null;

async function getMediaSrc(targetPath) {
  if (!targetPath) return '';
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://') || targetPath.startsWith('data:')) {
    return targetPath;
  }

  const resolvedPath = await callInvoke('read_media_src', { path: targetPath });
  if (!resolvedPath) return '';

  if (resolvedPath.startsWith('http://') || resolvedPath.startsWith('https://') || resolvedPath.startsWith('data:')) {
    return resolvedPath;
  }

  const convertFn = window.__TAURI__?.core?.convertFileSrc 
    || window.__TAURI_INTERNALS__?.convertFileSrc
    || window.__TAURI__?.tauri?.convertFileSrc;

  if (typeof convertFn === 'function') {
    return convertFn(resolvedPath);
  }
  return resolvedPath;
}

async function playInternalMedia(targetPath, title = 'Tocando Mídia') {
  const playerContainer = document.getElementById('internal-player');
  const mediaEl = document.getElementById('media-element');
  const playerTitle = document.getElementById('player-title');
  if (!playerContainer || !mediaEl) return;

  if (playerTitle) playerTitle.textContent = title;
  playerContainer.classList.remove('hidden');

  // Para qualquer reprodução anterior
  mediaEl.pause();
  mediaEl.src = '';

  try {
    const src = await getMediaSrc(targetPath);
    if (!src) {
      if (playerTitle) playerTitle.textContent = 'Erro: Mídia inválida';
      return;
    }

    // Define src e força o carregamento
    mediaEl.src = src;
    mediaEl.load();

    // Aguarda o media estar pronto para reproduzir antes de chamar play()
    await new Promise((resolve, reject) => {
      const onCanPlay = () => { mediaEl.removeEventListener('canplay', onCanPlay); mediaEl.removeEventListener('error', onError); resolve(); };
      const onError = (e) => { mediaEl.removeEventListener('canplay', onCanPlay); mediaEl.removeEventListener('error', onError); reject(e); };
      mediaEl.addEventListener('canplay', onCanPlay);
      mediaEl.addEventListener('error', onError);
      // Timeout de segurança: 15s
      setTimeout(() => { mediaEl.removeEventListener('canplay', onCanPlay); mediaEl.removeEventListener('error', onError); reject(new Error('Timeout ao carregar mídia')); }, 15000);
    });

    await mediaEl.play();
  } catch (err) {
    console.warn('Playback no player interno falhou:', err);
    if (playerTitle) {
      playerTitle.textContent = typeof err === 'string' ? err : (err?.message || 'Erro ao reproduzir mídia');
    }
  }
}


async function callInvoke(cmd, args = {}) {
  const invokeFn = window.__TAURI__?.core?.invoke 
    || window.__TAURI_INTERNALS__?.invoke
    || window.__TAURI__?.tauri?.invoke;
  if (typeof invokeFn === 'function') {
    return await invokeFn(cmd, args);
  }
  console.warn('Tauri IPC não encontrado, executando fallback mock:', cmd, args);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSymbol = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `
    <span class="toast-icon">${iconSymbol}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}

let inMemoryShortcuts = null;

function loadShortcuts() {
  if (Array.isArray(inMemoryShortcuts)) {
    return inMemoryShortcuts;
  }
  const saved = localStorage.getItem('blastoles_shortcuts');
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        inMemoryShortcuts = parsed;
        return parsed;
      }
    } catch (e) {
      console.error('Erro ao ler atalhos do localStorage:', e);
    }
  }
  inMemoryShortcuts = DEFAULT_SHORTCUTS;
  return DEFAULT_SHORTCUTS;
}

async function syncGlobalShortcuts(shortcuts) {
  try {
    const listToRegister = shortcuts
      .filter(sc => sc.hotkey && sc.hotkey.trim().length > 0)
      .map(sc => ({
        hotkey: sc.hotkey.trim(),
        type: sc.type,
        target: sc.target
      }));
    await callInvoke('update_global_shortcuts', { shortcuts: listToRegister });
  } catch (err) {
    console.error('Erro ao atualizar atalhos globais no sistema:', err);
  }
}

async function saveShortcuts(shortcuts) {
  inMemoryShortcuts = shortcuts;
  localStorage.setItem('blastoles_shortcuts', JSON.stringify(shortcuts));
  try {
    await callInvoke('save_shortcuts_file', { content: JSON.stringify(shortcuts, null, 2) });
  } catch (e) {
    console.warn('Falha ao salvar atalhos no arquivo AppData:', e);
  }
  syncGlobalShortcuts(shortcuts);
}

async function initPersistentShortcuts() {
  try {
    const fileContent = await callInvoke('load_shortcuts_file');
    if (fileContent && typeof fileContent === 'string' && fileContent.trim().length > 0) {
      const parsed = JSON.parse(fileContent);
      if (Array.isArray(parsed)) {
        inMemoryShortcuts = parsed;
        localStorage.setItem('blastoles_shortcuts', JSON.stringify(parsed));
        renderShortcutsList();
        syncGlobalShortcuts(parsed);
        return;
      }
    }
  } catch (e) {
    console.warn('Carregamento de atalhos via Rust falhou ou arquivo ainda não existe:', e);
  }
  const initial = loadShortcuts();
  saveShortcuts(initial);
  renderShortcutsList();
}

function getIconSvg(type, iconClass) {
  if (type === 'audio' || iconClass === 'audio') {
    return `<div class="icon-wrapper audio-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></div>`;
  }
  if (type === 'app') {
    return `<div class="icon-wrapper terminal-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg></div>`;
  }
  if (iconClass === 'github') {
    return `<div class="icon-wrapper github-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg></div>`;
  }
  if (iconClass === 'nas') {
    return `<div class="icon-wrapper nas-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg></div>`;
  }
  return `<div class="icon-wrapper support-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>`;
}

let editingShortcutId = null;

function resetFormMode() {
  editingShortcutId = null;
  const formHeader = document.getElementById('form-header-title');
  const submitBtn = document.getElementById('btn-submit-shortcut');
  const cancelBtn = document.getElementById('btn-cancel-edit');
  const addForm = document.getElementById('add-shortcut-form');

  if (formHeader) formHeader.textContent = 'Adicionar Novo Atalho';
  if (submitBtn) submitBtn.textContent = '+ Adicionar Atalho';
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (addForm) addForm.reset();

  const typeSelect = document.getElementById('sc-type');
  if (typeSelect) {
    typeSelect.value = 'url';
    typeSelect.dispatchEvent(new Event('change'));
  }
}

function renderShortcutsList() {
  const shortcutListEl = document.getElementById('shortcut-list');
  const manageListEl = document.getElementById('manage-shortcuts-list');
  if (!shortcutListEl) return;

  const shortcuts = loadShortcuts();
  shortcutListEl.innerHTML = '';
  if (manageListEl) manageListEl.innerHTML = '';

  if (shortcuts.length === 0) {
    shortcutListEl.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <div class="empty-state-title">Nenhum atalho cadastrado</div>
        <div class="empty-state-sub">Cadastre seus sites, aplicativos ou arquivos de mídia favoritos.</div>
        <button id="empty-state-add-btn" class="empty-state-btn">+ Adicionar Atalho</button>
      </div>
    `;
    document.getElementById('empty-state-add-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('settings-modal')?.classList.remove('hidden');
    });
    return;
  }

  shortcuts.forEach((sc, index) => {
    // Botão na barra lateral
    const btn = document.createElement('button');
    btn.className = 'shortcut-btn';
    const hotkeyHtml = sc.hotkey ? `<span class="hotkey-badge">${escapeHtml(sc.hotkey)}</span>` : '';
    btn.innerHTML = `
      ${getIconSvg(sc.type, sc.icon)}
      <div class="btn-info">
        <span class="btn-label">${escapeHtml(sc.title)}</span>
        <span class="btn-sub">${escapeHtml(sc.sub)}</span>
      </div>
      ${hotkeyHtml}
    `;
    btn.addEventListener('click', async () => {
      if (sc.type === 'audio') {
        playInternalMedia(sc.target, sc.title);
      } else if (sc.type === 'url') {
        await callInvoke('open_url', { url: sc.target });
      } else {
        await callInvoke('open_local_tool', { path: sc.target });
      }
    });
    shortcutListEl.appendChild(btn);

    // Item no modal de gerenciamento
    if (manageListEl) {
      const manageItem = document.createElement('div');
      manageItem.className = 'manage-item';
      const hotkeyInfo = sc.hotkey ? ` | ⚡ ${escapeHtml(sc.hotkey)}` : '';
      const typeLabel = sc.type === 'audio' ? 'Áudio' : sc.type === 'url' ? 'Link' : 'App';
      const isFirst = index === 0;
      const isLast = index === shortcuts.length - 1;

      manageItem.innerHTML = `
        <div class="manage-item-info">
          <span class="manage-item-title">${escapeHtml(sc.title)}</span>
          <span class="manage-item-sub">${typeLabel}: ${escapeHtml(sc.target)}${hotkeyInfo}</span>
        </div>
        <div class="manage-actions">
          <button class="btn-action-icon btn-move-up" title="Mover para cima" aria-label="Mover para cima" ${isFirst ? 'disabled' : ''}>▲</button>
          <button class="btn-action-icon btn-move-down" title="Mover para baixo" aria-label="Mover para baixo" ${isLast ? 'disabled' : ''}>▼</button>
          <button class="btn-action-icon btn-edit-item" title="Editar atalho" aria-label="Editar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </button>
          <button class="btn-action-icon btn-delete-item" title="Remover atalho" aria-label="Remover">&times;</button>
        </div>
      `;

      manageItem.querySelector('.btn-move-up')?.addEventListener('click', async () => {
        if (index > 0) {
          const current = loadShortcuts();
          const temp = current[index];
          current[index] = current[index - 1];
          current[index - 1] = temp;
          await saveShortcuts(current);
          renderShortcutsList();
        }
      });

      manageItem.querySelector('.btn-move-down')?.addEventListener('click', async () => {
        if (index < shortcuts.length - 1) {
          const current = loadShortcuts();
          const temp = current[index];
          current[index] = current[index + 1];
          current[index + 1] = temp;
          await saveShortcuts(current);
          renderShortcutsList();
        }
      });

      manageItem.querySelector('.btn-edit-item')?.addEventListener('click', () => {
        editingShortcutId = sc.id;
        document.getElementById('sc-title').value = sc.title;
        document.getElementById('sc-sub').value = sc.sub || '';
        const typeSelect = document.getElementById('sc-type');
        if (typeSelect) {
          typeSelect.value = sc.type;
          typeSelect.dispatchEvent(new Event('change'));
        }
        document.getElementById('sc-target').value = sc.target;
        const hotkeyInput = document.getElementById('sc-hotkey');
        if (hotkeyInput) hotkeyInput.value = sc.hotkey || '';

        const formHeader = document.getElementById('form-header-title');
        const submitBtn = document.getElementById('btn-submit-shortcut');
        const cancelBtn = document.getElementById('btn-cancel-edit');

        if (formHeader) formHeader.textContent = 'Editar Atalho';
        if (submitBtn) submitBtn.textContent = 'Salvar Alterações';
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        document.getElementById('sc-title')?.focus();
      });

      manageItem.querySelector('.btn-delete-item')?.addEventListener('click', async () => {
        if (editingShortcutId === sc.id) {
          resetFormMode();
        }
        const current = loadShortcuts();
        const updated = current.filter(item => item.id !== sc.id);
        await saveShortcuts(updated);
        renderShortcutsList();
        showToast('Atalho removido', 'info');
      });

      manageListEl.appendChild(manageItem);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  const toggleBtn = document.getElementById('toggle-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const modalOverlay = document.getElementById('settings-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const resetBtn = document.getElementById('reset-defaults-btn');
  const addForm = document.getElementById('add-shortcut-form');
  const cancelEditBtn = document.getElementById('btn-cancel-edit');
  const browseFileBtn = document.getElementById('browse-file-btn');
  const exportBackupBtn = document.getElementById('export-backup-btn');
  const importBackupBtn = document.getElementById('import-backup-btn');
  const typeSelect = document.getElementById('sc-type');
  const targetLabel = document.getElementById('sc-target-label');
  const targetInput = document.getElementById('sc-target');
  const closePlayerBtn = document.getElementById('close-player-btn');
  const mediaEl = document.getElementById('media-element');

  let isOpen = false;
  let isAnimating = false;

  const autostartCheckbox = document.getElementById('autostart-checkbox');

  initPersistentShortcuts();

  // Escuta eventos vindos do Rust (ex: acionamento por HotKey global ou menu da bandeja)
  const listenFn = window.__TAURI__?.event?.listen || window.__TAURI_INTERNALS__?.listen;
  if (typeof listenFn === 'function') {
    listenFn('play-internal-media', (event) => {
      if (event.payload) {
        playInternalMedia(event.payload, 'Mídia via HotKey');
      }
    });
    listenFn('open-settings-modal', () => {
      modalOverlay?.classList.remove('hidden');
    });
  }

  async function syncAutostartState() {
    try {
      const isEnabledFn = window.__TAURI__?.autostart?.isEnabled;
      let enabled = false;
      if (typeof isEnabledFn === 'function') {
        enabled = await isEnabledFn();
      } else {
        enabled = await callInvoke('plugin:autostart|is_enabled');
      }

      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'http:';
      if (isDev && enabled) {
        const disableFn = window.__TAURI__?.autostart?.disable;
        if (typeof disableFn === 'function') await disableFn();
        else await callInvoke('plugin:autostart|disable');
        enabled = false;
      }

      const autostartInitialized = localStorage.getItem('blastoles_autostart_init');
      if (!autostartInitialized) {
        localStorage.setItem('blastoles_autostart_init', 'true');
        if (!enabled && !isDev) {
          const enableFn = window.__TAURI__?.autostart?.enable;
          if (typeof enableFn === 'function') await enableFn();
          else await callInvoke('plugin:autostart|enable');
          enabled = true;
        }
      }

      if (autostartCheckbox) autostartCheckbox.checked = !!enabled;
    } catch (e) {
      console.warn('Erro ao consultar status de autostart:', e);
      if (autostartCheckbox) autostartCheckbox.checked = false;
    }
  }

  syncAutostartState();

  autostartCheckbox?.addEventListener('change', async (e) => {
    const shouldEnable = e.target.checked;
    try {
      if (shouldEnable) {
        const enableFn = window.__TAURI__?.autostart?.enable;
        if (typeof enableFn === 'function') await enableFn();
        else await callInvoke('plugin:autostart|enable');
      } else {
        const disableFn = window.__TAURI__?.autostart?.disable;
        if (typeof disableFn === 'function') await disableFn();
        else await callInvoke('plugin:autostart|disable');
      }
    } catch (err) {
      console.error('Erro ao alterar autostart:', err);
      syncAutostartState();
    }
  });

  const sideSelect = document.getElementById('side-select');
  const monitorSelect = document.getElementById('monitor-select');
  let currentSide = localStorage.getItem('blastoles_sidebar_side') || 'right';
  let currentMonitor = localStorage.getItem('blastoles_sidebar_monitor') || 'auto';

  function getSelectedMonitorIndex() {
    return currentMonitor === 'auto' ? null : parseInt(currentMonitor, 10);
  }

  async function loadAvailableMonitors() {
    if (!monitorSelect) return;
    try {
      const monitors = await callInvoke('get_available_monitors');
      monitorSelect.innerHTML = '<option value="auto">Automático / Atual</option>';
      if (Array.isArray(monitors)) {
        monitors.forEach(mon => {
          const opt = document.createElement('option');
          opt.value = String(mon.index);
          opt.textContent = mon.name;
          monitorSelect.appendChild(opt);
        });
      }
      monitorSelect.value = currentMonitor;
    } catch (err) {
      console.warn('Erro ao carregar lista de monitores:', err);
    }
  }

  loadAvailableMonitors();

  monitorSelect?.addEventListener('change', async (e) => {
    currentMonitor = e.target.value;
    localStorage.setItem('blastoles_sidebar_monitor', currentMonitor);
    try {
      await callInvoke('toggle_drawer_size', {
        open: isOpen,
        side: currentSide,
        monitorIndex: getSelectedMonitorIndex()
      });
    } catch (err) {
      console.error('Erro ao alternar monitor:', err);
    }
  });

  function applySidebarSide(side) {
    currentSide = side;
    localStorage.setItem('blastoles_sidebar_side', side);
    if (sideSelect) sideSelect.value = side;
    if (side === 'left') {
      container.classList.add('side-left');
    } else {
      container.classList.remove('side-left');
    }
  }

  applySidebarSide(currentSide);

  // Reposiciona a janela no lado e monitor salvos imediatamente ao iniciar
  callInvoke('toggle_drawer_size', {
    open: false,
    side: currentSide,
    monitorIndex: getSelectedMonitorIndex()
  }).catch(err => console.warn('Erro no posicionamento inicial:', err));

  sideSelect?.addEventListener('change', async (e) => {
    const newSide = e.target.value;
    applySidebarSide(newSide);
    try {
      await callInvoke('toggle_drawer_size', {
        open: isOpen,
        side: newSide,
        monitorIndex: getSelectedMonitorIndex()
      });
    } catch (err) {
      console.error('Erro ao atualizar lado no backend Rust:', err);
    }
  });

  closePlayerBtn?.addEventListener('click', () => {
    if (mediaEl) {
      mediaEl.pause();
      mediaEl.src = '';
    }
    document.getElementById('internal-player')?.classList.add('hidden');
  });

  async function openDrawer() {
    if (isAnimating || isOpen) return;
    isAnimating = true;

    try {
      await callInvoke('toggle_drawer_size', {
        open: true,
        side: currentSide,
        monitorIndex: getSelectedMonitorIndex()
      });
      container.classList.add('open');
      isOpen = true;
    } catch (err) {
      console.error('Erro ao abrir gaveta:', err);
    } finally {
      isAnimating = false;
    }
  }

  async function closeDrawer() {
    if (isAnimating || !isOpen) return;
    isAnimating = true;

    try {
      container.classList.remove('open');
      isOpen = false;
      modalOverlay?.classList.add('hidden');

      setTimeout(async () => {
        try {
          await callInvoke('toggle_drawer_size', {
            open: false,
            side: currentSide,
            monitorIndex: getSelectedMonitorIndex()
          });
        } catch (err) {
          console.error('Erro ao redimensionar janela:', err);
        } finally {
          isAnimating = false;
        }
      }, 300);
    } catch (err) {
      console.error('Erro ao fechar gaveta:', err);
      isAnimating = false;
    }
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  // Modal Controls
  settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    modalOverlay?.classList.remove('hidden');
  });

  closeModalBtn?.addEventListener('click', () => {
    modalOverlay?.classList.add('hidden');
  });

  typeSelect?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'url') {
      targetLabel.textContent = 'Endereço (URL)';
      targetInput.placeholder = 'https://exemplo.com';
      browseFileBtn?.classList.add('hidden');
    } else if (val === 'audio') {
      targetLabel.textContent = 'Arquivo de Áudio / Som (MP4, MP3)';
      targetInput.placeholder = 'som.mp4, C:\\sons\\alerta.mp3, https://...';
      browseFileBtn?.classList.remove('hidden');
    } else {
      targetLabel.textContent = 'Comando / Aplicativo';
      targetInput.placeholder = 'cmd.exe, calc.exe, C:\\...';
      browseFileBtn?.classList.remove('hidden');
    }
  });

  browseFileBtn?.addEventListener('click', async () => {
    const type = typeSelect?.value;
    try {
      if (type === 'audio') {
        const selected = await callInvoke('pick_and_copy_media');
        if (selected) targetInput.value = selected;
      } else if (type === 'app') {
        const selected = await callInvoke('pick_app_file');
        if (selected) targetInput.value = selected;
      }
    } catch (err) {
      console.error('Erro ao selecionar arquivo:', err);
    }
  });

  exportBackupBtn?.addEventListener('click', async () => {
    const shortcuts = loadShortcuts();
    try {
      await callInvoke('export_backup_file', { content: JSON.stringify(shortcuts, null, 2) });
      showToast('Backup exportado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      showToast('Erro ao exportar backup', 'error');
    }
  });

  importBackupBtn?.addEventListener('click', async () => {
    try {
      const content = await callInvoke('import_backup_file');
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          await saveShortcuts(parsed);
          resetFormMode();
          renderShortcutsList();
          showToast('Backup importado com sucesso!', 'success');
        } else {
          showToast('Formato de backup inválido', 'error');
        }
      }
    } catch (err) {
      console.error('Erro ao importar backup:', err);
      showToast('Erro ao importar backup', 'error');
    }
  });

  addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('sc-title').value.trim();
    const sub = document.getElementById('sc-sub').value.trim();
    const type = document.getElementById('sc-type').value;
    let target = document.getElementById('sc-target').value.trim();
    const hotkeyInput = document.getElementById('sc-hotkey');
    const hotkey = hotkeyInput ? hotkeyInput.value.trim() : '';

    if (!title || !target) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }

    if (type === 'audio' && !target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('data:')) {
      try {
        const appDataTarget = await callInvoke('ensure_media_in_appdata', { path: target });
        if (appDataTarget) target = appDataTarget;
      } catch (err) {
        console.warn('Não foi possível copiar arquivo para AppData:', err);
      }
    }

    const shortcuts = loadShortcuts();
    const icon = type === 'url' ? 'support' : type === 'audio' ? 'audio' : 'terminal';
    const subText = sub || (type === 'url' ? 'Link Web' : type === 'audio' ? 'Player de Som' : 'Aplicativo Local');
    const isEdit = !!editingShortcutId;

    if (editingShortcutId) {
      const idx = shortcuts.findIndex(s => s.id === editingShortcutId);
      if (idx !== -1) {
        shortcuts[idx] = {
          ...shortcuts[idx],
          title,
          sub: subText,
          type,
          target,
          icon,
          hotkey
        };
      }
    } else {
      shortcuts.push({
        id: Date.now().toString(),
        title,
        sub: subText,
        type,
        target,
        icon,
        hotkey
      });
    }

    await saveShortcuts(shortcuts);
    resetFormMode();
    renderShortcutsList();
    showToast(isEdit ? 'Atalho atualizado!' : 'Atalho adicionado com sucesso!', 'success');
  });

  cancelEditBtn?.addEventListener('click', () => {
    resetFormMode();
  });

  resetBtn?.addEventListener('click', async () => {
    resetFormMode();
    await saveShortcuts(DEFAULT_SHORTCUTS);
    renderShortcutsList();
    showToast('Atalhos padrões restaurados!', 'info');
  });
});
