// ── State ───────────────────────────────────────────────────────────────────
let currentFile = null;
let currentConversionType = 'video';

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
  const { dialog } = require('@electron/remote');
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: getFileFilters()
  });

  if (!result.canceled && result.filePaths.length > 0) {
    currentFile = result.filePaths[0];
    document.getElementById('btn-convert').disabled = false;
    updateSettingsPanel();
    showToast('Archivo cargado: ' + getFileName(currentFile));
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

function getFileName(path) {
  return path.split(/[/\\]/).pop();
}

// ── Update settings panel ────────────────────────────────────────────────────
function updateSettingsPanel() {
  const settingsContent = document.getElementById('settings-content');
  
  if (!currentFile) {
    settingsContent.innerHTML = `
      <div id="empty-settings">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p>Selecciona un tipo de conversión y abre un archivo</p>
      </div>
    `;
    return;
  }

  let settingsHTML = `
    <div class="file-info">
      <div class="file-info-name">${getFileName(currentFile)}</div>
      <div class="file-info-details">Tipo: ${currentConversionType}</div>
    </div>
  `;

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
        <option value="mp4">MP4</option>
        <option value="avi">AVI</option>
        <option value="mkv">MKV</option>
        <option value="mov">MOV</option>
        <option value="webm">WebM</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Calidad</label>
      <select class="setting-select" id="quality">
        <option value="high">Alta</option>
        <option value="medium">Media</option>
        <option value="low">Baja</option>
      </select>
    </div>
  `;
}

function getAudioSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="mp3">MP3</option>
        <option value="wav">WAV</option>
        <option value="ogg">OGG</option>
        <option value="flac">FLAC</option>
        <option value="aac">AAC</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Bitrate</label>
      <select class="setting-select" id="bitrate">
        <option value="320k">320 kbps</option>
        <option value="256k">256 kbps</option>
        <option value="192k">192 kbps</option>
        <option value="128k">128 kbps</option>
      </select>
    </div>
  `;
}

function getExtractAudioSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de audio</label>
      <select class="setting-select" id="output-format">
        <option value="mp3">MP3</option>
        <option value="wav">WAV</option>
        <option value="ogg">OGG</option>
        <option value="flac">FLAC</option>
        <option value="aac">AAC</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Bitrate</label>
      <select class="setting-select" id="bitrate">
        <option value="320k">320 kbps</option>
        <option value="256k">256 kbps</option>
        <option value="192k">192 kbps</option>
        <option value="128k">128 kbps</option>
      </select>
    </div>
  `;
}

function getImageSettings() {
  return `
    <div class="setting-group">
      <label class="setting-label">Formato de salida</label>
      <select class="setting-select" id="output-format">
        <option value="jpg">JPG</option>
        <option value="png">PNG</option>
        <option value="webp">WebP</option>
        <option value="gif">GIF</option>
        <option value="bmp">BMP</option>
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
        <option value="jpg">JPG</option>
        <option value="webp">WebP</option>
      </select>
    </div>
    <div class="setting-group">
      <label class="setting-label">Calidad: <span id="quality-value">80</span>%</label>
      <input type="range" class="setting-range" id="quality" min="1" max="100" value="80">
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
document.getElementById('btn-convert').addEventListener('click', async () => {
  if (!currentFile) return;

  const btn = document.getElementById('btn-convert');
  btn.disabled = true;
  btn.textContent = 'Convirtiendo...';

  try {
    const outputFormat = document.getElementById('output-format')?.value;
    await performConversion(currentFile, outputFormat);
    showToast('Conversión completada exitosamente', 'success');
  } catch (error) {
    showToast('Error en la conversión: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
  }
});

async function performConversion(inputFile, outputFormat) {
  // This is a placeholder - actual conversion logic will be implemented
  // with FFmpeg, Sharp, and LibreOffice-Convert
  console.log('Converting', inputFile, 'to', outputFormat);
  
  // Simulate conversion delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // In a real implementation, this would call the actual conversion functions
  // based on the currentConversionType
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
