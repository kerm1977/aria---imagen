// ── State ───────────────────────────────────────────────────────────────────
let currentFiles = [];
let currentConversionType = 'video';
let lastPath = null;
let outputFolder = null;
let isConverting = false;
let conversionQueue = [];
let activePromises = [];
let ffmpegSettings = {
  preset: 'medium',
  threads: '0',
  hardwareAccel: false,
  fastDecode: false
};
let consolePanelVisible = false;

// ── Console/Logs Panel ───────────────────────────────────────────────────────
function addLog(message, type = 'info') {
  const consoleContent = document.getElementById('console-content');
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
  consoleContent.appendChild(logEntry);
  consoleContent.scrollTop = consoleContent.scrollHeight;
}

document.getElementById('btn-console').addEventListener('click', () => {
  const consolePanel = document.getElementById('console-panel');
  consolePanelVisible = !consolePanelVisible;
  consolePanel.classList.toggle('active', consolePanelVisible);
  addLog('Panel de consola ' + (consolePanelVisible ? 'abierto' : 'cerrado'), 'info');
});

document.getElementById('btn-close-console').addEventListener('click', () => {
  const consolePanel = document.getElementById('console-panel');
  consolePanelVisible = false;
  consolePanel.classList.remove('active');
  addLog('Panel de consola cerrado', 'info');
});

document.getElementById('btn-clear-logs').addEventListener('click', () => {
  const consoleContent = document.getElementById('console-content');
  consoleContent.innerHTML = '';
  addLog('Logs limpiados', 'info');
});

document.getElementById('btn-copy-logs').addEventListener('click', () => {
  const consoleContent = document.getElementById('console-content');
  const logText = consoleContent.innerText;
  if (logText.trim()) {
    navigator.clipboard.writeText(logText).then(() => {
      showToast('Logs copiados al portapapeles', 'success');
    }).catch(err => {
      showToast('Error al copiar logs: ' + err.message, 'error');
    });
  } else {
    showToast('No hay logs para copiar', 'warning');
  }
});

// Intercept console.log, console.error, console.warn
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  originalLog.apply(console, args);
  addLog(args.join(' '), 'info');
};

console.error = function(...args) {
  originalError.apply(console, args);
  addLog(args.join(' '), 'error');
};

console.warn = function(...args) {
  originalWarn.apply(console, args);
  addLog(args.join(' '), 'warning');
};

// ── Window controls ───────────────────────────────────────────────────────────
document.getElementById('winMinimize').addEventListener('click', () => window.api.windowMinimize());
document.getElementById('winMaximize').addEventListener('click', () => window.api.windowMaximize());
document.getElementById('winClose').addEventListener('click', () => window.api.windowClose());

// ── Theme toggle ─────────────────────────────────────────────────────────────
document.getElementById('titleBarTheme').addEventListener('click', () => {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  html.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
});

// ── Settings modal ───────────────────────────────────────────────────────────
document.getElementById('btn-settings').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.add('active');
});

document.getElementById('close-settings').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.remove('active');
});

document.getElementById('settings-modal').addEventListener('click', (e) => {
  if (e.target.id === 'settings-modal') {
    document.getElementById('settings-modal').classList.remove('active');
  }
});

// Save FFmpeg settings
document.getElementById('ffmpeg-preset').addEventListener('change', (e) => {
  ffmpegSettings.preset = e.target.value;
});

document.getElementById('ffmpeg-threads').addEventListener('change', (e) => {
  ffmpegSettings.threads = e.target.value;
});

document.getElementById('chk-hardware-accel').addEventListener('change', (e) => {
  ffmpegSettings.hardwareAccel = e.target.checked;
});

document.getElementById('chk-fast-decode').addEventListener('change', (e) => {
  ffmpegSettings.fastDecode = e.target.checked;
});

// ── Confirm modal ───────────────────────────────────────────────────────────
function showConfirm(message, callback) {
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-modal').classList.add('active');
  confirmCallback = callback;
}

document.getElementById('confirm-cancel').addEventListener('click', () => {
  document.getElementById('confirm-modal').classList.remove('active');
  confirmCallback = null;
});

document.getElementById('confirm-ok').addEventListener('click', () => {
  document.getElementById('confirm-modal').classList.remove('active');
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
});

document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target.id === 'confirm-modal') {
    document.getElementById('confirm-modal').classList.remove('active');
    confirmCallback = null;
  }
});

// ── Clear button ─────────────────────────────────────────────────────────────
// Modal clear button only (toolbar button removed)
document.getElementById('modal-btn-clear').addEventListener('click', () => {
  if (currentFiles.length === 0) {
    showToast('No hay archivos para limpiar', 'info');
    return;
  }

  showConfirm('¿Estás seguro de que deseas limpiar todos los archivos de la lista?', () => {
    currentFiles = [];
    conversionQueue = [];
    updateSettingsPanel();
    document.getElementById('btn-convert').disabled = true;
    document.getElementById('modal-btn-convert').disabled = true;
    showToast('Lista limpiada exitosamente', 'success');
  });
});

// ── Neon border animation ─────────────────────────────────────────────────────
const neonColors = [
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ff0080', // Hot pink
  '#80ff00', // Lime
  '#ff8000', // Orange
  '#00ff80', // Spring green
  '#8000ff', // Violet
  '#ff0040', // Rose
  '#40ff00', // Bright green
  '#0040ff', // Electric blue
];

function changeNeonBorder() {
  const randomColor = neonColors[Math.floor(Math.random() * neonColors.length)];
  document.body.style.borderColor = randomColor;
}

setInterval(changeNeonBorder, 2000);

// ── Conversion type selection ────────────────────────────────────────────────
const conversionItems = document.querySelectorAll('.conversion-item');
conversionItems.forEach(item => {
  item.addEventListener('click', async () => {
    conversionItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    currentConversionType = item.dataset.type;
    updateSettingsPanel();
    console.log(`[TAB] Cambiado a: ${currentConversionType}`);
    // Auto-open file dialog for this conversion type
    await openFileDialog();
  });
});

// ── File selection ───────────────────────────────────────────────────────────
async function openFileDialog() {
  const dialogOptions = {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Todos los archivos', extensions: ['*'] }, ...getFileFilters()]
  };

  if (lastPath) dialogOptions.defaultPath = lastPath;

  console.log(`[FILE-DIALOG] Abriendo diálogo para: ${currentConversionType}`);
  const result = await window.api.showOpenDialog(dialogOptions);

  if (!result.canceled && result.filePaths.length > 0) {
    const newFiles = result.filePaths.map(p => ({
      path: p,
      name: getFileName(p),
      progress: 0,
      status: 'pending'
    }));
    currentFiles = [...currentFiles, ...newFiles];
    lastPath = result.filePaths[0].substring(0, result.filePaths[0].lastIndexOf('/'));
    document.getElementById('btn-convert').disabled = false;
    document.getElementById('modal-btn-convert').disabled = false;
    updateSettingsPanel();
    console.log(`[FILE-DIALOG] ${newFiles.length} archivo(s) cargado(s): ${newFiles.map(f => f.name).join(', ')}`);
    showToast(`${newFiles.length} archivo(s) cargado(s)`);
  } else {
    console.log(`[FILE-DIALOG] Cancelado por el usuario`);
  }
}

document.getElementById('btn-open-file').addEventListener('click', async () => {
  await openFileDialog();
});

// ── Folder selection ───────────────────────────────────────────────────────────
document.getElementById('btn-open-folder').addEventListener('click', async () => {
  const dialogOptions = {
    properties: ['openDirectory']
  };

  if (lastPath) {
    dialogOptions.defaultPath = lastPath;
  }

  const result = await window.api.showOpenFolder(dialogOptions);

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    lastPath = folderPath;

    // Get all files in folder based on conversion type
    const extensions = getFileExtensions();
    const files = await window.api.readFolderFiles(folderPath, extensions);

    currentFiles = files.map(file => ({
      path: file.path,
      name: file.name,
      progress: 0,
      status: 'pending'
    }));

    document.getElementById('btn-convert').disabled = false;
    updateSettingsPanel();
    showToast(`${currentFiles.length} archivo(s) de carpeta cargado(s)`);
  }
});

// ── Output folder selection ─────────────────────────────────────────────────────
document.getElementById('btn-select-output').addEventListener('click', async () => {
  const dialogOptions = {
    properties: ['openDirectory']
  };

  if (outputFolder) {
    dialogOptions.defaultPath = outputFolder;
  } else if (lastPath) {
    dialogOptions.defaultPath = lastPath;
  }

  const result = await window.api.showSaveFolder(dialogOptions);

  if (!result.canceled && result.filePaths.length > 0) {
    outputFolder = result.filePaths[0];
    showToast(`Carpeta de salida: ${outputFolder}`);
    updateSettingsPanel();
  }
});

function getFileFilters() {
  switch (currentConversionType) {
    case 'video':
      return [
        { name: 'Videos', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    case 'audio':
      return [
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    case 'extract-audio':
      return [
        { name: 'Videos', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    case 'image':
      return [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    case 'document':
      return [
        { name: 'Documentos de texto', extensions: ['docx', 'doc', 'odf', 'txt', 'xml', 'json', 'ott', 'docm', 'html', 'fodt', 'uot', 'rtf', 'odt'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    case 'spreadsheet':
      return [
        { name: 'Hojas de cálculo', extensions: ['xls', 'ods', 'ots', 'fods', 'uds', 'xlsx', 'dif', 'dbf', 'slk', 'csv', 'xlsm'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    case 'presentation':
      return [
        { name: 'Presentaciones', extensions: ['ps', 'ppsx', 'odp', 'odg', 'fodp', 'uop', 'potx', 'ppt', 'ppsx', 'pptx', 'potx', 'pptm'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    case 'compress':
      return [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ];
    default:
      return [{ name: 'Todos los archivos', extensions: ['*'] }];
  }
}

function getFileExtensions() {
  switch (currentConversionType) {
    case 'video':
      return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    case 'audio':
      return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
    case 'extract-audio':
      return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    case 'image':
      return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
    case 'document':
      return ['docx', 'doc', 'odf', 'txt', 'xml', 'json', 'ott', 'docm', 'html', 'fodt', 'uot', 'rtf', 'odt'];
    case 'spreadsheet':
      return ['xls', 'ods', 'ots', 'fods', 'uds', 'xlsx', 'dif', 'dbf', 'slk', 'csv', 'xlsm'];
    case 'presentation':
      return ['ps', 'ppsx', 'odp', 'odg', 'fodp', 'uop', 'potx', 'ppt', 'ppsx', 'pptx', 'potx', 'pptm'];
    case 'compress':
      return ['jpg', 'jpeg', 'png', 'webp'];
    default:
      return [];
  }
}

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'];
  const documentExts = ['docx', 'doc', 'odf', 'txt', 'xml', 'json', 'ott', 'docm', 'html', 'fodt', 'uot', 'rtf', 'odt', 'pdf'];
  const spreadsheetExts = ['xls', 'ods', 'ots', 'fods', 'uds', 'xlsx', 'dif', 'dbf', 'slk', 'csv', 'xlsm', 'pdf'];
  const presentationExts = ['ps', 'ppsx', 'odp', 'odg', 'fodp', 'uop', 'potx', 'ppt', 'ppsx', 'pptx', 'potx', 'pptm', 'pdf'];

  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (imageExts.includes(ext)) return 'image';
  if (documentExts.includes(ext)) return 'document';
  if (spreadsheetExts.includes(ext)) return 'spreadsheet';
  if (presentationExts.includes(ext)) return 'presentation';
  return 'unknown';
}

function getFileTypeLabel(conversionType) {
  switch (conversionType) {
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'extract-audio':
      return 'video';
    case 'image':
      return 'imagen';
    case 'document':
      return 'documento';
    case 'spreadsheet':
      return 'hoja de cálculo';
    case 'presentation':
      return 'presentación';
    case 'compress':
      return 'imagen';
    default:
      return 'este tipo';
  }
}

function getFileName(path) {
  return path.split(/[/\\]/).pop();
}

// ── Update settings panel ────────────────────────────────────────────────────
function updateSettingsPanel() {
  const settingsContent = document.getElementById('settings-content');

  if (currentFiles.length === 0) {
    settingsContent.innerHTML = `
      <div id="empty-settings">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>Selecciona un tipo de conversión y abre archivos o carpeta</p>
      </div>
    `;
    return;
  }

  let settingsHTML = `
    <div class="file-info">
      <div class="file-info-name">${currentFiles.length} archivo(s) seleccionado(s)</div>
      <div class="file-info-details">Tipo: ${currentConversionType}</div>
      <div class="file-info-details">Carpeta de salida: ${outputFolder || 'No seleccionada (misma carpeta)'}</div>
    </div>
  `;

  // Add file list with progress bars (filtered by conversion type)
  settingsHTML += '<div class="file-list">';
  let visibleFiles = 0;
  currentFiles.forEach((file, index) => {
    const fileType = getFileType(file.name);

    // Filter files based on current conversion type
    let shouldShow = false;
    switch (currentConversionType) {
      case 'video':
        shouldShow = fileType === 'video';
        break;
      case 'audio':
        shouldShow = fileType === 'audio';
        break;
      case 'extract-audio':
        shouldShow = fileType === 'video';
        break;
      case 'image':
        shouldShow = fileType === 'image';
        break;
      case 'document':
        shouldShow = fileType === 'document';
        break;
      case 'spreadsheet':
        shouldShow = fileType === 'spreadsheet';
        break;
      case 'presentation':
        shouldShow = fileType === 'presentation';
        break;
      case 'compress':
        shouldShow = fileType === 'image';
        break;
      default:
        shouldShow = true;
    }

    if (shouldShow) {
      visibleFiles++;
      const isPaused = file.status === 'Pausado';
      const isConverting = file.status === 'Convirtiendo...';
      const showPauseBtn = isConverting || isPaused;

      settingsHTML += `
        <div class="file-item" data-index="${index}">
          <div class="file-item-header">
            <div class="file-item-name">${file.name}</div>
            <div class="file-item-actions">
              ${showPauseBtn ? `
                <button class="file-item-pause" data-index="${index}" title="${isPaused ? 'Reanudar' : 'Pausar'}">
                  ${isPaused ?
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' :
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
                  }
                </button>
              ` : ''}
              <button class="file-item-remove" data-index="${index}" title="Eliminar archivo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div class="file-item-status">${file.status}</div>
          <div class="file-item-progress">
            <div class="progress-bar">
              <div class="progress-fill" data-progress="${file.progress}"></div>
            </div>
            <div class="progress-text">${file.progress}%</div>
          </div>
        </div>
      `;
    }
  });

  // Show message if no files of this type
  if (visibleFiles === 0) {
    settingsHTML += `
      <div class="no-files-message">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>No hay archivos de este tipo</p>
        <p class="sub-text">Sube archivos de ${getFileTypeLabel(currentConversionType)} para continuar</p>
      </div>
    `;
  }

  settingsHTML += '</div>';

  switch (currentConversionType) {
    case 'video':
      settingsHTML += getVideoSettings();
      break;
    case 'audio':
      settingsHTML += getAudioSettings();
      break;
    case 'extract-audio':
      settingsHTML += getExtractAudioSettings();
      break;
    case 'image':
      settingsHTML += getImageSettings();
      break;
    case 'document':
      settingsHTML += getDocumentSettings();
      break;
    case 'spreadsheet':
      settingsHTML += getSpreadsheetSettings();
      break;
    case 'presentation':
      settingsHTML += getPresentationSettings();
      break;
    case 'compress':
      settingsHTML += getCompressSettings();
      break;
  }

  settingsContent.innerHTML = settingsHTML;
}

function getVideoSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="mp4">MP4 (H.264/AAC)</option>
        <option value="avi">AVI (H.264/MP3)</option>
        <option value="mkv">MKV (H.264/AAC)</option>
        <option value="mov">MOV (H.264/AAC)</option>
        <option value="webm">WebM (VP9/Opus)</option>
        <option value="flv">FLV (FLV/AAC)</option>
        <option value="wmv">WMV (WMV2/WMV2)</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Resolución</label>
      <select class="setting-select" id="resolution">
        <option value="original">Original</option>
        <option value="432p">432p (480p Mobile)</option>
        <option value="480p">480p (SD)</option>
        <option value="576p">576p (PAL)</option>
        <option value="720p">720p (HD)</option>
        <option value="1080p">1080p (Full HD)</option>
        <option value="1440p">1440p (2K QHD)</option>
        <option value="2160p">2160p (4K UHD)</option>
        <option value="4320p">4320p (8K UHD)</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Calidad (CRF)</label>
      <select class="setting-select" id="quality">
        <option value="high">Alta (CRF 18)</option>
        <option value="medium">Media (CRF 23)</option>
        <option value="low">Baja (CRF 28)</option>
      </select>
    </div>
  `;
}

function getAudioSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="mp3">MP3 (LAME)</option>
        <option value="wav">WAV (PCM)</option>
        <option value="ogg">OGG (Vorbis)</option>
        <option value="flac">FLAC (Lossless)</option>
        <option value="aac">AAC</option>
        <option value="m4a">M4A (AAC)</option>
        <option value="opus">Opus</option>
        <option value="wma">WMA</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Calidad</label>
      <select class="setting-select" id="quality">
        <option value="high">Alta (320 kbps)</option>
        <option value="medium">Media (192 kbps)</option>
        <option value="low">Baja (128 kbps)</option>
      </select>
    </div>
  `;
}

function getExtractAudioSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de audio</label>
      <select class="setting-select" id="output-format">
        <option value="mp3">MP3 (LAME)</option>
        <option value="wav">WAV (PCM)</option>
        <option value="ogg">OGG (Vorbis)</option>
        <option value="flac">FLAC (Lossless)</option>
        <option value="aac">AAC</option>
        <option value="m4a">M4A (AAC)</option>
        <option value="opus">Opus</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Calidad</label>
      <select class="setting-select" id="quality">
        <option value="high">Alta (320 kbps)</option>
        <option value="medium">Media (192 kbps)</option>
        <option value="low">Baja (128 kbps)</option>
      </select>
    </div>
  `;
}

function getImageSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="jpg">JPG (JPEG)</option>
        <option value="png">PNG</option>
        <option value="webp">WebP</option>
        <option value="gif">GIF</option>
        <option value="bmp">BMP</option>
        <option value="tiff">TIFF</option>
        <option value="avif">AVIF</option>
        <option value="heif">HEIF</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Calidad: <span id="quality-value">80</span>%</label>
      <input type="range" class="setting-range" id="quality" min="1" max="100" value="80">
    </div>
  `;
}

function getDocumentSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="pdf">PDF</option>
        <option value="docx">DOCX</option>
        <option value="doc">DOC</option>
        <option value="odt">ODT</option>
        <option value="txt">TXT</option>
        <option value="rtf">RTF</option>
        <option value="html">HTML</option>
      </select>
    </div>
    <p class="setting-note">
      Requiere LibreOffice instalado en el sistema
    </p>
  `;
}

function getSpreadsheetSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="xlsx">XLSX</option>
        <option value="xls">XLS</option>
        <option value="ods">ODS</option>
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
      </select>
    </div>
    <p class="setting-note">
      Requiere LibreOffice instalado en el sistema
    </p>
  `;
}

function getPresentationSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="pptx">PPTX</option>
        <option value="ppt">PPT</option>
        <option value="odp">ODP</option>
        <option value="pdf">PDF</option>
      </select>
    </div>
    <p class="setting-note">
      Requiere LibreOffice instalado en el sistema
    </p>
  `;
}

function getCompressSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="jpg">JPG (JPEG)</option>
        <option value="png">PNG</option>
        <option value="webp">WebP</option>
        <option value="avif">AVIF</option>
        <option value="heif">HEIF</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Calidad: <span id="quality-value">70</span>%</label>
      <input type="range" class="setting-range" id="quality" min="1" max="100" value="70">
    </div>
  `;
}

// Quality range listener
document.addEventListener('input', (e) => {
  if (e.target.id === 'quality') {
    document.getElementById('quality-value').textContent = e.target.value;
  }
});

// ── Mini Player ───────────────────────────────────────────────────────────────
const miniPlayerModal = document.getElementById('mini-player-modal');
const videoPlayer = document.getElementById('video-player');
const audioPlayer = document.getElementById('audio-player');
const imagePreview = document.getElementById('image-preview');
const noPreview = document.getElementById('no-preview');
const playerTitle = document.getElementById('player-title');

// ── Context Menu ───────────────────────────────────────────────────────────────
const contextMenu = document.getElementById('context-menu');
let contextMenuFileIndex = null;

// Close context menu on click elsewhere
document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.add('hidden-menu');
  }
});

// Single right-click handler for file items
document.addEventListener('contextmenu', (e) => {
  const fileItem = e.target.closest('.file-item');

  if (fileItem) {
    // Right-click on file item - show context menu
    e.preventDefault();
    contextMenuFileIndex = parseInt(fileItem.dataset.index);
    const file = currentFiles[contextMenuFileIndex];

    if (file) {
      // Position context menu and make it visible
      contextMenu.classList.remove('hidden-menu');
      contextMenu.style.left = e.pageX + 'px';
      contextMenu.style.top = e.pageY + 'px';

      // Enable/disable menu items based on file status
      const isConverting = file.status === 'Convirtiendo...';
      const isPaused = file.status === 'Pausado';
      const isCompleted = file.status === 'Completado';
      const isPending = file.status === 'Pendiente';

      // Delete - always enabled unless converting
      const deleteItem = contextMenu.querySelector('[data-action="delete"]');
      deleteItem.classList.toggle('disabled', isConverting);

      // Open location - always enabled
      const openLocationItem = contextMenu.querySelector('[data-action="open-location"]');
      openLocationItem.classList.remove('disabled');

      // Pause - only enabled if converting
      const pauseItem = contextMenu.querySelector('[data-action="pause"]');
      pauseItem.classList.toggle('disabled', !isConverting);

      // Resume - only enabled if paused
      const resumeItem = contextMenu.querySelector('[data-action="resume"]');
      resumeItem.classList.toggle('disabled', !isPaused);

      // View - enabled for media files
      const viewItem = contextMenu.querySelector('[data-action="view"]');
      const fileType = getFileType(file.name);
      viewItem.classList.toggle('disabled', fileType === 'document' || fileType === 'unknown');

      // Info - always enabled
      const infoItem = contextMenu.querySelector('[data-action="info"]');
      infoItem.classList.remove('disabled');
    }
  } else {
    // Right-click elsewhere - hide context menu
    contextMenu.classList.add('hidden-menu');
  }
});

// Context menu item click handler
contextMenu.addEventListener('click', async (e) => {
  const menuItem = e.target.closest('.context-menu-item');
  if (menuItem && !menuItem.classList.contains('disabled')) {
    const action = menuItem.dataset.action;
    const file = currentFiles[contextMenuFileIndex];

    if (file) {
      switch (action) {
        case 'delete':
          showConfirmModal('¿Eliminar este archivo de la lista?', async () => {
            // Remove file from array
            currentFiles.splice(contextMenuFileIndex, 1);

            // Update conversion queue
            conversionQueue = conversionQueue.filter(task => task.index !== contextMenuFileIndex);
            // Update indices in queue
            conversionQueue.forEach((task, i) => {
              if (task.index > contextMenuFileIndex) {
                task.index--;
              }
            });

            // Update UI
            updateSettingsPanel();

            // Disable convert button if no files left
            if (currentFiles.length === 0) {
              document.getElementById('btn-convert').disabled = true;
              document.getElementById('modal-btn-convert').disabled = true;
            }

            showToast('Archivo eliminado de la lista', 'info');
          });
          break;

        case 'open-location':
          const folderPath = file.path.substring(0, file.path.lastIndexOf('/'));
          await window.api.openFolder(folderPath);
          break;

        case 'pause':
          if (file.status === 'Convirtiendo...') {
            file.status = 'Pausado';
            showToast('Archivo pausado', 'info');
            updateSettingsPanel();
          }
          break;

        case 'resume':
          if (file.status === 'Pausado') {
            file.status = 'Convirtiendo...';
            showToast('Archivo reanudado', 'info');
            updateSettingsPanel();
          }
          break;

        case 'view':
          openMiniPlayer(file.path, file.name);
          break;

        case 'info':
          await showFileInfo(file);
          break;
      }
    }

    contextMenu.classList.add('hidden-menu');
  }
});

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');
const closeConfirm = document.getElementById('close-confirm');
let confirmCallback = null;

function showConfirmModal(message, callback) {
  confirmMessage.textContent = message;
  confirmCallback = callback;
  confirmModal.classList.add('active');
}

function hideConfirmModal() {
  confirmModal.classList.remove('active');
  confirmCallback = null;
}

confirmYes.addEventListener('click', () => {
  if (confirmCallback) {
    confirmCallback();
  }
  hideConfirmModal();
});

confirmNo.addEventListener('click', hideConfirmModal);
closeConfirm.addEventListener('click', hideConfirmModal);

confirmModal.addEventListener('click', (e) => {
  if (e.target.id === 'confirm-modal') {
    hideConfirmModal();
  }
});

// ── Info Modal ───────────────────────────────────────────────────────────────
const infoModal = document.getElementById('info-modal');
const fileInfoContent = document.getElementById('file-info-content');
const closeInfo = document.getElementById('close-info');

async function showFileInfo(file) {
  const result = await window.api.getFileInfo(file.path);

  if (result.success) {
    const info = result.info;
    let infoHTML = `
      <div class="info-row">
        <span class="info-label">Nombre:</span>
        <span class="info-value">${info.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Ubicación:</span>
        <span class="info-value">${info.directory}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Tamaño:</span>
        <span class="info-value">${info.size}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Extensión:</span>
        <span class="info-value">${info.extension}</span>
      </div>
    `;

    if (info.codec) {
      infoHTML += `
        <div class="info-row">
          <span class="info-label">Codec:</span>
          <span class="info-value">${info.codec}</span>
        </div>
      `;
    }

    if (info.width && info.height) {
      infoHTML += `
        <div class="info-row">
          <span class="info-label">Resolución:</span>
          <span class="info-value">${info.width}x${info.height}</span>
        </div>
      `;
    }

    if (info.duration) {
      const minutes = Math.floor(info.duration / 60);
      const seconds = info.duration % 60;
      infoHTML += `
        <div class="info-row">
          <span class="info-label">Duración:</span>
          <span class="info-value">${minutes}:${seconds.toString().padStart(2, '0')}</span>
        </div>
      `;
    }

    if (info.bitrate) {
      infoHTML += `
        <div class="info-row">
          <span class="info-label">Bitrate:</span>
          <span class="info-value">${info.bitrate} kbps</span>
        </div>
      `;
    }

    fileInfoContent.innerHTML = infoHTML;
    infoModal.classList.add('active');
  } else {
    showToast('Error al obtener información del archivo', 'error');
  }
}

closeInfo.addEventListener('click', () => {
  infoModal.classList.remove('active');
});

infoModal.addEventListener('click', (e) => {
  if (e.target.id === 'info-modal') {
    infoModal.classList.remove('active');
  }
});

// ── About Modal ───────────────────────────────────────────────────────────────
const aboutModal = document.getElementById('about-modal');
const closeAbout = document.getElementById('close-about');
const btnInfo = document.getElementById('btn-info');

btnInfo.addEventListener('click', () => {
  aboutModal.classList.add('active');
});

closeAbout.addEventListener('click', () => {
  aboutModal.classList.remove('active');
});

aboutModal.addEventListener('click', (e) => {
  if (e.target.id === 'about-modal') {
    aboutModal.classList.remove('active');
  }
});

function openMiniPlayer(filePath, fileName) {
  const fileType = getFileType(fileName);
  playerTitle.textContent = fileName;

  // Reset all players
  videoPlayer.classList.add('hidden-player');
  videoPlayer.pause();
  videoPlayer.src = '';

  audioPlayer.classList.add('hidden-player');
  audioPlayer.pause();
  audioPlayer.src = '';

  imagePreview.classList.add('hidden-player');
  imagePreview.src = '';

  noPreview.style.display = 'none';

  // Show appropriate player based on file type
  if (fileType === 'video') {
    videoPlayer.classList.remove('hidden-player');
    videoPlayer.src = 'file://' + filePath;
    videoPlayer.play();
  } else if (fileType === 'audio') {
    audioPlayer.classList.remove('hidden-player');
    audioPlayer.src = 'file://' + filePath;
    audioPlayer.play();
  } else if (fileType === 'image') {
    imagePreview.classList.remove('hidden-player');
    imagePreview.src = 'file://' + filePath;
  } else {
    noPreview.style.display = 'flex';
  }

  miniPlayerModal.classList.add('active');
}

function closeMiniPlayer() {
  videoPlayer.pause();
  videoPlayer.src = '';
  audioPlayer.pause();
  audioPlayer.src = '';
  imagePreview.src = '';
  miniPlayerModal.classList.remove('active');
}

document.getElementById('close-player').addEventListener('click', closeMiniPlayer);

miniPlayerModal.addEventListener('click', (e) => {
  if (e.target.id === 'mini-player-modal') {
    closeMiniPlayer();
  }
});

// Add double-click handler to file items (delegated event)
document.addEventListener('dblclick', (e) => {
  const fileItem = e.target.closest('.file-item');
  if (fileItem) {
    const index = fileItem.dataset.index;
    const file = currentFiles[index];
    if (file) {
      openMiniPlayer(file.path, file.name);
    }
  }
});

// Add remove button handler (delegated event)
document.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.file-item-remove');
  if (removeBtn) {
    const index = parseInt(removeBtn.dataset.index);
    if (index >= 0 && index < currentFiles.length) {
      // Check if file is currently being converted
      if (currentFiles[index].status === 'Convirtiendo...' || currentFiles[index].status === 'Pausado') {
        showToast('No se puede eliminar un archivo que se está convirtiendo', 'warning');
        return;
      }

      // Remove file from array
      currentFiles.splice(index, 1);

      // Update conversion queue
      conversionQueue = conversionQueue.filter(task => task.index !== index);
      // Update indices in queue
      conversionQueue.forEach((task, i) => {
        if (task.index > index) {
          task.index--;
        }
      });

      // Update UI
      updateSettingsPanel();

      // Disable convert button if no files left
      if (currentFiles.length === 0) {
        document.getElementById('btn-convert').disabled = true;
        document.getElementById('modal-btn-convert').disabled = true;
      }

      showToast('Archivo eliminado de la lista', 'info');
    }
  }

  // Add pause/resume button handler (delegated event)
  const pauseBtn = e.target.closest('.file-item-pause');
  if (pauseBtn) {
    const index = parseInt(pauseBtn.dataset.index);
    if (index >= 0 && index < currentFiles.length) {
      const file = currentFiles[index];
      if (file.status === 'Convirtiendo...') {
        // Pause the file
        file.status = 'Pausado';
        showToast('Archivo pausado', 'info');
        updateSettingsPanel();
      } else if (file.status === 'Pausado') {
        // Resume the file
        file.status = 'Convirtiendo...';
        showToast('Archivo reanudado', 'info');
        updateSettingsPanel();
      }
    }
  }
});

// ── Convert button ────────────────────────────────────────────────────────────
// Toolbar convert button
document.getElementById('btn-convert').addEventListener('click', async () => {
  if (currentFiles.length === 0) return;

  isConverting = true;
  updateControlButtons(true);

  const btn = document.getElementById('btn-convert');
  const modalBtn = document.getElementById('modal-btn-convert');
  btn.disabled = true;
  modalBtn.disabled = true;
  btn.textContent = 'Convirtiendo...';
  modalBtn.textContent = 'Convirtiendo...';

  const outputFormat = document.getElementById('output-format')?.value;
  let quality = document.getElementById('quality')?.value;
  const resolution = document.getElementById('resolution')?.value || 'original';
  const openFolder = document.getElementById('chk-open-folder').checked;
  const concurrentConversions = parseInt(document.getElementById('concurrent-conversions').value);

  // Convert quality to number for image/compress types (slider values)
  if (currentConversionType === 'image' || currentConversionType === 'compress') {
    quality = parseInt(quality) || 80;
  }

  // Build conversion queue
  conversionQueue = currentFiles.map((file, index) => {
    const fileExt = file.name.split('.').pop().toLowerCase();

    // Skip conversion if input and output formats are the same
    if (fileExt === outputFormat) {
      showToast(`Saltando ${file.name}: mismo formato (${fileExt})`, 'warning');
      return null;
    }


    return {
      file,
      index,
      outputFormat,
      quality,
      resolution,
      conversionType: currentConversionType
    };
  }).filter(task => task !== null); // Remove null entries (skipped files)

  // Check if all files were skipped
  if (conversionQueue.length === 0) {
    showToast('No hay archivos para convertir (todos tienen el mismo formato)', 'warning');
    isConverting = false;
    updateControlButtons(false);
    btn.disabled = false;
    modalBtn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    modalBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    return;
  }

  try {
    await processConversionQueue(concurrentConversions);

    showToast('Conversión completada exitosamente', 'success');

    // Open output folder if checkbox is checked
    if (openFolder && outputFolder) {
      await window.api.openFolder(outputFolder);
    } else if (openFolder && currentFiles.length > 0) {
      // Open the folder of the first converted file
      const firstFile = currentFiles[0];
      const folderPath = firstFile.path.substring(0, firstFile.path.lastIndexOf('/'));
      await window.api.openFolder(folderPath);
    }
  } catch (error) {
    console.error('Conversion error:', error);
    showToast('Error en la conversión: ' + error.message, 'error');
  } finally {
    isConverting = false;
    conversionQueue = [];
    updateControlButtons(false);
    btn.disabled = false;
    modalBtn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    modalBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
  }
});

// Modal convert button
document.getElementById('modal-btn-convert').addEventListener('click', async () => {
  if (currentFiles.length === 0) return;

  isConverting = true;
  updateControlButtons(true);

  const btn = document.getElementById('btn-convert');
  const modalBtn = document.getElementById('modal-btn-convert');
  btn.disabled = true;
  modalBtn.disabled = true;
  btn.textContent = 'Convirtiendo...';
  modalBtn.textContent = 'Convirtiendo...';

  const outputFormat = document.getElementById('output-format')?.value;
  let quality = document.getElementById('quality')?.value;
  const resolution = document.getElementById('resolution')?.value || 'original';
  const openFolder = document.getElementById('chk-open-folder').checked;
  const concurrentConversions = parseInt(document.getElementById('concurrent-conversions').value);

  // Convert quality to number for image/compress types (slider values)
  if (currentConversionType === 'image' || currentConversionType === 'compress') {
    quality = parseInt(quality) || 80;
  }

  // Build conversion queue
  conversionQueue = currentFiles.map((file, index) => {
    const fileExt = file.name.split('.').pop().toLowerCase();

    // Skip conversion if input and output formats are the same
    if (fileExt === outputFormat) {
      showToast(`Saltando ${file.name}: mismo formato (${fileExt})`, 'warning');
      return null;
    }


    return {
      file,
      index,
      outputFormat,
      quality,
      resolution,
      conversionType: currentConversionType
    };
  }).filter(task => task !== null); // Remove null entries (skipped files)

  // Check if all files were skipped
  if (conversionQueue.length === 0) {
    showToast('No hay archivos para convertir (todos tienen el mismo formato)', 'warning');
    isConverting = false;
    updateControlButtons(false);
    btn.disabled = false;
    modalBtn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    modalBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    return;
  }

  try {
    await processConversionQueue(concurrentConversions);

    showToast('Conversión completada exitosamente', 'success');

    // Open output folder if checkbox is checked
    if (openFolder && outputFolder) {
      await window.api.openFolder(outputFolder);
    } else if (openFolder && currentFiles.length > 0) {
      // Open the folder of the first converted file
      const firstFile = currentFiles[0];
      const folderPath = firstFile.path.substring(0, firstFile.path.lastIndexOf('/'));
      await window.api.openFolder(folderPath);
    }
  } catch (error) {
    console.error('Conversion error:', error);
    showToast('Error en la conversión: ' + error.message, 'error');
  } finally {
    isConverting = false;
    conversionQueue = [];
    updateControlButtons(false);
    btn.disabled = false;
    modalBtn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    modalBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
  }
});

// ── Control buttons ───────────────────────────────────────────────────────────
// Modal buttons only (toolbar buttons removed)
document.getElementById('modal-btn-pause').addEventListener('click', async () => {
  await window.api.pauseConversions();
  showToast('Conversiones pausadas', 'info');
  updateControlButtons(true, true);
});

document.getElementById('modal-btn-resume').addEventListener('click', async () => {
  await window.api.resumeConversions();
  showToast('Conversiones reanudadas', 'info');
  updateControlButtons(true, false);
});

document.getElementById('modal-btn-stop').addEventListener('click', async () => {
  await window.api.stopConversions();
  showToast('Conversiones detenidas', 'warning');
  isConverting = false;
  conversionQueue = [];
  activePromises = [];
  updateControlButtons(false);

  // Reset file statuses
  currentFiles.forEach((file, index) => {
    if (file.status === 'Convirtiendo...' || file.status === 'Pausado') {
      file.status = 'Pendiente';
      file.progress = 0;
      updateFileProgress(index, 0);
    }
  });

  document.getElementById('btn-convert').disabled = false;
  document.getElementById('modal-btn-convert').disabled = false;
  document.getElementById('btn-convert').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
  document.getElementById('modal-btn-convert').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
});

function updateControlButtons(converting, paused = false) {
  // Update modal buttons only
  document.getElementById('modal-btn-pause').disabled = !converting || paused;
  document.getElementById('modal-btn-resume').disabled = !converting || !paused;
  document.getElementById('modal-btn-stop').disabled = !converting;
}

async function processConversionQueue(concurrentConversions) {
  console.log(`[QUEUE] Iniciando cola: ${conversionQueue.length} archivo(s), ${concurrentConversions} simultáneo(s)`);

  while (conversionQueue.length > 0 && isConverting) {
    const batch = conversionQueue.splice(0, concurrentConversions);
    console.log(`[QUEUE] Procesando lote de ${batch.length} archivo(s), restantes en cola: ${conversionQueue.length}`);

    const promises = batch.map(task => {
      const file = currentFiles[task.index];
      file.status = 'Convirtiendo...';
      updateFileProgress(task.index, 0);
      console.log(`[QUEUE] Iniciando: ${file.name} → ${task.outputFormat} (tipo: ${task.conversionType})`);

      return Promise.race([
        performConversion(task.file, task.outputFormat, task.quality, task.index, task.conversionType, task.resolution, ffmpegSettings),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Conversión excedió tiempo límite (120s)')), 120000)
        )
      ])
        .then(() => {
          file.status = 'Completado';
          file.progress = 100;
          updateFileProgress(task.index, 100);
          console.log(`[QUEUE] ✓ Completado: ${file.name}`);
        })
        .catch(err => {
          file.status = 'Error: ' + (err.message || 'Error desconocido');
          updateFileProgress(task.index, file.progress);
          console.error(`[QUEUE] ✗ Error en ${file.name}: ${err.message}`);
        });
    });

    activePromises = promises;
    await Promise.allSettled(promises);

    console.log(`[QUEUE] Lote completado. Archivos en cola: ${conversionQueue.length}`);

    if (conversionQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('[QUEUE] Cola de conversión finalizada');
}

function updateFileProgress(index, progress) {
  const fileItem = document.querySelector(`.file-item[data-index="${index}"]`);
  if (fileItem) {
    const progressFill = fileItem.querySelector('.progress-fill');
    const progressText = fileItem.querySelector('.progress-text');
    const statusText = fileItem.querySelector('.file-item-status');

    if (progressFill) {
      progressFill.style.width = progress + '%';
      progressFill.setAttribute('data-progress', progress);
    }
    if (progressText) progressText.textContent = progress + '%';
    if (statusText) statusText.textContent = currentFiles[index].status;
  }
}

async function performConversion(file, outputFormat, quality, fileIndex, conversionType, resolution, ffmpegSettings) {
  const startTime = Date.now();
  console.log(`[CONVERSION] ▶ Iniciando: ${file.name} → ${outputFormat}`);
  console.log(`[CONVERSION] Tipo: ${conversionType} | Calidad: ${quality ?? 'default'} | Resolución: ${resolution} | Carpeta salida: ${outputFolder ?? 'misma carpeta'}`);
  console.log(`[CONVERSION] Ruta: ${file.path}`);

  const progressListener = (event, data) => {
    if (data && data.index === fileIndex) {
      file.progress = data.progress;
      updateFileProgress(fileIndex, data.progress);
      if (data.progress % 20 === 0) {
        console.log(`[CONVERSION] Progreso ${file.name}: ${data.progress}%`);
      }
    }
  };

  window.api.onConversionProgress(progressListener);

  try {
    const result = await window.api.performConversion(file, outputFormat, quality, outputFolder, fileIndex, conversionType, resolution, ffmpegSettings);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CONVERSION] ✓ Completado: ${file.name} en ${elapsed}s`);
    return result;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[CONVERSION] ✗ Error en ${file.name} (${elapsed}s): ${error.message}`);
    throw error;
  } finally {
    window.api.removeConversionProgressListener(progressListener);
  }
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
