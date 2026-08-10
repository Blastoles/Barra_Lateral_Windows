const DEFAULT_SHORTCUTS = [
  { id: '1', title: 'GitHub Blastoles', sub: 'Repositórios & Código Aberto', type: 'url', target: 'https://github.com/Blastoles', icon: 'github', hotkey: '' },
  { id: '2', title: 'Painel SRVBackup', sub: 'Servidor NAS & Armazenamento', type: 'url', target: 'http://srvbackup', icon: 'nas', hotkey: '' },
  { id: '3', title: 'Sistema de Chamados', sub: 'Suporte & Central de Ajuda', type: 'url', target: 'https://github.com/Blastoles', icon: 'support', hotkey: '' },
  { id: '4', title: 'Ferramenta Local', sub: 'Prompt de Comando / Windows', type: 'app', target: 'cmd.exe', icon: 'terminal', hotkey: '' }
];

let activeAudio = null;

async function playInternalMedia(targetPath, title = 'Tocando Mídia') {
  const playerContainer = document.getElementById('internal-player');
  const mediaEl = document.getElementById('media-element');
  const playerTitle = document.getElementById('player-title');
  if (!playerContainer || !mediaEl) return;

  if (playerTitle) playerTitle.textContent = title;
  playerContainer.classList.remove('hidden');

  try {
    let src = targetPath;
    if (!targetPath.startsWith('http://') && !targetPath.startsWith('https://') && !targetPath.startsWith('data:')) {
      const b64Data = await callInvoke('read_media_src', { path: targetPath });
      if (b64Data) {
        src = b64Data;
      } else {
        const convertFn = window.__TAURI__?.core?.convertFileSrc || window.__TAURI_INTERNALS__?.convertFileSrc;
        if (typeof convertFn === 'function') src = convertFn(targetPath);
      }
    }

    mediaEl.src = src;
    await mediaEl.play();
  } catch (err) {
    console.warn('Playback no player interno falhou:', err);
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

function loadShortcuts() {
  const saved = localStorage.getItem('blastoles_shortcuts');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Erro ao ler atalhos salvos:', e);
    }
  }
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

function saveShortcuts(shortcuts) {
  localStorage.setItem('blastoles_shortcuts', JSON.stringify(shortcuts));
  syncGlobalShortcuts(shortcuts);
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

function renderShortcutsList() {
  const shortcutListEl = document.getElementById('shortcut-list');
  const manageListEl = document.getElementById('manage-shortcuts-list');
  if (!shortcutListEl) return;

  const shortcuts = loadShortcuts();
  shortcutListEl.innerHTML = '';
  if (manageListEl) manageListEl.innerHTML = '';

  shortcuts.forEach((sc) => {
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
      manageItem.innerHTML = `
        <div class="manage-item-info">
          <span class="manage-item-title">${escapeHtml(sc.title)}</span>
          <span class="manage-item-sub">${typeLabel}: ${escapeHtml(sc.target)}${hotkeyInfo}</span>
        </div>
        <button class="btn-delete-item" title="Remover atalho" aria-label="Remover">&times;</button>
      `;
      manageItem.querySelector('.btn-delete-item').addEventListener('click', () => {
        const current = loadShortcuts();
        const updated = current.filter(item => item.id !== sc.id);
        saveShortcuts(updated);
        renderShortcutsList();
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
  const typeSelect = document.getElementById('sc-type');
  const targetLabel = document.getElementById('sc-target-label');
  const targetInput = document.getElementById('sc-target');
  const closePlayerBtn = document.getElementById('close-player-btn');
  const mediaEl = document.getElementById('media-element');

  let isOpen = false;
  let isAnimating = false;

  const currentShortcuts = loadShortcuts();
  renderShortcutsList();
  syncGlobalShortcuts(currentShortcuts);

  // Escuta eventos vindos do Rust (ex: acionamento por HotKey global)
  const listenFn = window.__TAURI__?.event?.listen || window.__TAURI_INTERNALS__?.listen;
  if (typeof listenFn === 'function') {
    listenFn('play-internal-media', (event) => {
      if (event.payload) {
        playInternalMedia(event.payload, 'Mídia via HotKey');
      }
    });
  }

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
      await callInvoke('toggle_drawer_size', { open: true });
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
          await callInvoke('toggle_drawer_size', { open: false });
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
    if (e.target.value === 'url') {
      targetLabel.textContent = 'Endereço (URL)';
      targetInput.placeholder = 'https://exemplo.com';
    } else if (e.target.value === 'audio') {
      targetLabel.textContent = 'Arquivo de Áudio / Som (MP4, MP3)';
      targetInput.placeholder = 'som.mp4, C:\\sons\\alerta.mp3, https://...';
    } else {
      targetLabel.textContent = 'Comando / Aplicativo';
      targetInput.placeholder = 'cmd.exe, calc.exe, C:\\...';
    }
  });

  addForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('sc-title').value.trim();
    const sub = document.getElementById('sc-sub').value.trim();
    const type = document.getElementById('sc-type').value;
    const target = document.getElementById('sc-target').value.trim();
    const hotkeyInput = document.getElementById('sc-hotkey');
    const hotkey = hotkeyInput ? hotkeyInput.value.trim() : '';

    if (!title || !target) return;

    const shortcuts = loadShortcuts();
    shortcuts.push({
      id: Date.now().toString(),
      title,
      sub: sub || (type === 'url' ? 'Link Web' : type === 'audio' ? 'Player de Som' : 'Aplicativo Local'),
      type,
      target,
      icon: type === 'url' ? 'support' : type === 'audio' ? 'audio' : 'terminal',
      hotkey
    });

    saveShortcuts(shortcuts);
    renderShortcutsList();
    addForm.reset();
  });

  resetBtn?.addEventListener('click', () => {
    saveShortcuts(DEFAULT_SHORTCUTS);
    renderShortcutsList();
  });
});
