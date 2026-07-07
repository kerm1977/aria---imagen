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
let confirmCallback = null;

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
  item.addEventListener('click', () => {
    conversionItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    currentConversionType = item.dataset.type;
    updateSettingsPanel();
  });
});

// ── File selection ───────────────────────────────────────────────────────────
document.getElementById('btn-open-file').addEventListener('click', async () => {
  const dialogOptions = {
    properties: ['openFile', 'multiSelections'],
    filters: getFileFilters()
  };

  if (lastPath) {
    dialogOptions.defaultPath = lastPath;
  }

  const result = await window.api.showOpenDialog(dialogOptions);

  if (!result.canceled && result.filePaths.length > 0) {
    currentFiles = result.filePaths.map(path => ({
      path: path,
      name: getFileName(path),
      progress: 0,
      status: 'pending'
    }));
    lastPath = result.filePaths[0].substring(0, result.filePaths[0].lastIndexOf('/'));
    document.getElementById('btn-convert').disabled = false;
    updateSettingsPanel();
    showToast(`${currentFiles.length} archivo(s) cargado(s)`);
  }
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
        { name: 'Documentos', extensions: ['docx', 'doc', 'odt', 'txt', 'rtf'] },
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
      return ['docx', 'doc', 'odt', 'txt', 'rtf'];
    case 'compress':
      return ['jpg', 'jpeg', 'png', 'webp'];
    default:
      return [];
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

  // Add file list with progress bars
  settingsHTML += '<div class="file-list">';
  currentFiles.forEach((file, index) => {
    settingsHTML += `
      <div class="file-item" data-index="${index}">
        <div class="file-item-name">${file.name}</div>
        <div class="file-item-status">${file.status}</div>
        <div class="file-item-progress">
          <div class="progress-bar">
            <div class="progress-fill" data-progress="${file.progress}"></div>
          </div>
          <div class="progress-text">${file.progress}%</div>
        </div>
      </div>
    `;
  });
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
      <label class="setting-label">Calidad</label>
      <select class="setting-select" id="quality">
        <option value="high">Alta (95%)</option>
        <option value="medium">Media (80%)</option>
        <option value="low">Baja (60%)</option>
      </select>
    </div>
  `;
}

function getDocumentSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="pdf">PDF</option>
      </select>
    </div>
    <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
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
  const quality = document.getElementById('quality')?.value;
  const resolution = document.getElementById('resolution')?.value || 'original';
  const openFolder = document.getElementById('chk-open-folder').checked;
  const concurrentConversions = parseInt(document.getElementById('concurrent-conversions').value);

  // Build conversion queue
  conversionQueue = currentFiles.map((file, index) => ({
    file,
    index,
    outputFormat,
    quality,
    resolution,
    conversionType: currentConversionType
  }));

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
  const quality = document.getElementById('quality')?.value;
  const resolution = document.getElementById('resolution')?.value || 'original';
  const openFolder = document.getElementById('chk-open-folder').checked;
  const concurrentConversions = parseInt(document.getElementById('concurrent-conversions').value);

  // Build conversion queue
  conversionQueue = currentFiles.map((file, index) => ({
    file,
    index,
    outputFormat,
    quality,
    resolution,
    conversionType: currentConversionType
  }));

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
  while (conversionQueue.length > 0 && isConverting) {
    const batch = conversionQueue.splice(0, concurrentConversions);
    const promises = batch.map(task => {
      const file = currentFiles[task.index];
      file.status = 'Convirtiendo...';
      updateFileProgress(task.index, 0);

      return performConversion(task.file, task.outputFormat, task.quality, task.index, task.conversionType, task.resolution, ffmpegSettings)
        .then(() => {
          file.status = 'Completado';
          file.progress = 100;
          updateFileProgress(task.index, 100);
        })
        .catch(err => {
          console.error('Conversion failed for file:', file.name, err);
          file.status = 'Error: ' + (err.message || 'Error desconocido');
          updateFileProgress(task.index, file.progress);
        });
    });

    activePromises = promises;
    await Promise.allSettled(promises); // Use allSettled to continue even if some fail
  }
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
  // Listen for progress updates
  const progressListener = (event, data) => {
    if (data && data.index === fileIndex) {
      file.progress = data.progress;
      updateFileProgress(fileIndex, data.progress);
    }
  };

  window.api.onConversionProgress(progressListener);

  try {
    // Call main process to perform conversion
    const result = await window.api.performConversion(file, outputFormat, quality, outputFolder, fileIndex, conversionType, resolution, ffmpegSettings);
    return result;
  } catch (error) {
    console.error('Conversion error in performConversion:', error);
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
