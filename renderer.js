const state = require('./renderer/modules/state');
const { addLog, initConsolePanel } = require('./renderer/modules/console');
const { initUIControls, initConfirmModal, initInfoModal, initAboutModal } = require('./renderer/modules/ui');
const { getFileName, getFileType, getFileFilters, getFileExtensions, openFileDialog } = require('./renderer/modules/file-handling');
const { updateFileProgress, performConversion, processConversionQueue, startConversion } = require('./renderer/modules/conversion');
const { showToast } = require('./renderer/modules/toast');
const { updateSettingsPanel } = require('./renderer/modules/settings-panel');

// ── Initialization ───────────────────────────────────────────────────────────────
initConsolePanel(state);
initUIControls();
const { showConfirmModal } = initConfirmModal();
const { showFileInfo } = initInfoModal();
initAboutModal();

// ── Conversion type selection ───────────────────────────────────────────────────────
const conversionItems = document.querySelectorAll('.conversion-item');
conversionItems.forEach(item => {
  item.addEventListener('click', async () => {
    conversionItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    state.currentConversionType = item.dataset.type;
    updateSettingsPanel();
    console.log(`[TAB] Cambiado a: ${state.currentConversionType}`);
    await openFileDialog(state, updateSettingsPanel, showToast);
  });
});

// ── File selection ───────────────────────────────────────────────────────────
document.getElementById('btn-open-file').addEventListener('click', async () => {
  await openFileDialog(state, updateSettingsPanel, showToast);
});

// ── Folder selection ───────────────────────────────────────────────────────────
document.getElementById('btn-open-folder').addEventListener('click', async () => {
  const dialogOptions = { properties: ['openDirectory'] };
  if (state.lastPath) dialogOptions.defaultPath = state.lastPath;

  const result = await window.api.showOpenFolder(dialogOptions);

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    state.lastPath = folderPath;

    const extensions = getFileExtensions();
    const files = await window.api.readFolderFiles(folderPath, extensions);

    state.currentFiles = files.map(file => ({
      path: file.path,
      name: file.name,
      progress: 0,
      status: 'pending'
    }));

    document.getElementById('btn-convert').disabled = false;
    document.getElementById('modal-btn-convert').disabled = false;
    updateSettingsPanel();
    showToast(`${state.currentFiles.length} archivo(s) cargado(s)`);
  }
});

// ── Output folder selection ───────────────────────────────────────────────────────
document.getElementById('btn-select-output').addEventListener('click', async () => {
  const dialogOptions = { properties: ['openDirectory'] };
  if (state.outputFolder) dialogOptions.defaultPath = state.outputFolder;

  const result = await window.api.showOpenFolder(dialogOptions);

  if (!result.canceled && result.filePaths.length > 0) {
    state.outputFolder = result.filePaths[0];
    document.getElementById('output-folder-path').textContent = state.outputFolder;
    showToast('Carpeta de salida seleccionada');
  }
});

// ── Clear files ───────────────────────────────────────────────────────────────────
document.getElementById('modal-btn-clear').addEventListener('click', () => {
  showConfirmModal('¿Eliminar todos los archivos?', () => {
    state.currentFiles = [];
    document.getElementById('btn-convert').disabled = true;
    document.getElementById('modal-btn-convert').disabled = true;
    updateSettingsPanel();
    showToast('Archivos eliminados');
  });
});

// ── Convert buttons ───────────────────────────────────────────────────────────────
document.getElementById('btn-convert').addEventListener('click', startConversion);
document.getElementById('modal-btn-convert').addEventListener('click', startConversion);

// ── Pause/Resume/Stop ─────────────────────────────────────────────────────────────
document.getElementById('modal-btn-pause').addEventListener('click', async () => {
  await window.api.pauseConversions();
  showToast('Conversiones pausadas', 'info');
  state.isConverting = false;
});

document.getElementById('modal-btn-resume').addEventListener('click', async () => {
  await window.api.resumeConversions();
  showToast('Conversiones reanudadas', 'info');
});

document.getElementById('modal-btn-stop').addEventListener('click', async () => {
  await window.api.stopConversions();
  showToast('Conversiones detenidas', 'warning');
  state.isConverting = false;
  state.conversionQueue = [];
  state.activePromises = [];

  state.currentFiles.forEach((file, index) => {
    if (file.status === 'Convirtiendo...' || file.status === 'Pausado') {
      file.status = 'Pendiente';
      file.progress = 0;
      updateFileProgress(index, 0);
    }
  });

  document.getElementById('btn-convert').disabled = false;
  document.getElementById('modal-btn-convert').disabled = false;
});

// ── File item interactions ───────────────────────────────────────────────────────
document.getElementById('files-list').addEventListener('click', (e) => {
  if (e.target.classList.contains('file-item-remove')) {
    const index = parseInt(e.target.dataset.index);
    state.currentFiles.splice(index, 1);
    updateSettingsPanel();
    showToast('Archivo eliminado');
  }
});

// ── Context menu ─────────────────────────────────────────────────────────────────
const contextMenu = document.getElementById('context-menu');

document.getElementById('files-list').addEventListener('contextmenu', (e) => {
  const fileItem = e.target.closest('.file-item');
  if (fileItem) {
    e.preventDefault();
    const index = parseInt(fileItem.dataset.index);
    const file = state.currentFiles[index];

    contextMenu.style.display = 'block';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';

    contextMenu.dataset.fileIndex = index;
  }
});

document.addEventListener('click', () => contextMenu.style.display = 'none');

contextMenu.addEventListener('click', (e) => {
  const action = e.target.dataset.action;
  const index = parseInt(contextMenu.dataset.fileIndex);
  const file = state.currentFiles[index];

  if (!action || !file) return;

  switch (action) {
    case 'delete':
      state.currentFiles.splice(index, 1);
      updateSettingsPanel();
      showToast('Archivo eliminado');
      break;
    case 'open-location':
      const { shell } = require('electron');
      shell.openPath(file.path);
      break;
    case 'pause':
      file.status = 'Pausado';
      updateFileProgress(index, file.progress);
      break;
    case 'resume':
      file.status = 'Convirtiendo...';
      updateFileProgress(index, file.progress);
      break;
    case 'view':
      const { shell } = require('electron');
      shell.openPath(file.path);
      break;
    case 'info':
      showFileInfo(file);
      break;
  }
});

// ── Mini player ─────────────────────────────────────────────────────────────────
const miniPlayer = document.getElementById('mini-player');
const miniPlayerVideo = document.getElementById('mini-player-video');
const miniPlayerAudio = document.getElementById('mini-player-audio');
const closeMiniPlayer = document.getElementById('close-mini-player');

function openMiniPlayer(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'wma'];

  if (videoExts.includes(ext)) {
    miniPlayerVideo.src = file.path;
    miniPlayerVideo.style.display = 'block';
    miniPlayerAudio.style.display = 'none';
  } else if (audioExts.includes(ext)) {
    miniPlayerAudio.src = file.path;
    miniPlayerAudio.style.display = 'block';
    miniPlayerVideo.style.display = 'none';
  }

  miniPlayer.classList.add('active');
}

function closeMiniPlayerFn() {
  miniPlayer.classList.remove('active');
  miniPlayerVideo.pause();
  miniPlayerVideo.src = '';
  miniPlayerAudio.pause();
  miniPlayerAudio.src = '';
}

closeMiniPlayer.addEventListener('click', closeMiniPlayerFn);

document.getElementById('files-list').addEventListener('dblclick', (e) => {
  const fileItem = e.target.closest('.file-item');
  if (fileItem) {
    const index = parseInt(fileItem.dataset.index);
    const file = state.currentFiles[index];
    openMiniPlayer(file);
  }
});

// ── Open DevTools ───────────────────────────────────────────────────────────────
document.getElementById('btn-devtools').addEventListener('click', () => {
  window.api.openDevTools();
});

// ── Neon border animation ─────────────────────────────────────────────────────────
const neonColors = ['#00ff00', '#ff00ff', '#00ffff', '#ffff00', '#ff6600'];

function changeNeonBorder() {
  const randomColor = neonColors[Math.floor(Math.random() * neonColors.length)];
  document.body.style.borderColor = randomColor;
}

setInterval(changeNeonBorder, 2000);

// ── Initial setup ─────────────────────────────────────────────────────────────────
addLog('Sistema de logs iniciado', 'info');
