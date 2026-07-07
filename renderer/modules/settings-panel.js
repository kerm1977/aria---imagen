function getVideoSettings() {
  return `
    <div class="setting-group">
      <label>Formato de salida</label>
      <select id="output-format">
        <option value="mp4">MP4</option>
        <option value="avi">AVI</option>
        <option value="mkv">MKV</option>
        <option value="mov">MOV</option>
        <option value="webm">WebM</option>
        <option value="flv">FLV</option>
        <option value="wmv">WMV</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Calidad</label>
      <select id="quality">
        <option value="low">Baja</option>
        <option value="medium" selected>Media</option>
        <option value="high">Alta</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Resolución</label>
      <select id="resolution">
        <option value="original" selected>Original</option>
        <option value="432p">432p (480p)</option>
        <option value="480p">480p</option>
        <option value="576p">576p</option>
        <option value="720p">720p HD</option>
        <option value="1080p">1080p Full HD</option>
        <option value="1440p">1440p 2K</option>
        <option value="2160p">2160p 4K</option>
        <option value="4320p">4320p 8K</option>
      </select>
    </div>
  `;
}

function getAudioSettings() {
  return `
    <div class="setting-group">
      <label>Formato de salida</label>
      <select id="output-format">
        <option value="mp3">MP3</option>
        <option value="wav">WAV</option>
        <option value="ogg">OGG</option>
        <option value="flac">FLAC</option>
        <option value="aac">AAC</option>
        <option value="m4a">M4A</option>
        <option value="opus">Opus</option>
        <option value="wma">WMA</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Calidad</label>
      <select id="quality">
        <option value="low">Baja (128kbps)</option>
        <option value="medium" selected>Media (192kbps)</option>
        <option value="high">Alta (320kbps)</option>
      </select>
    </div>
  `;
}

function getExtractAudioSettings() {
  return `
    <div class="setting-group">
      <label>Formato de audio</label>
      <select id="output-format">
        <option value="mp3">MP3</option>
        <option value="wav">WAV</option>
        <option value="ogg">OGG</option>
        <option value="flac">FLAC</option>
        <option value="aac">AAC</option>
        <option value="m4a">M4A</option>
        <option value="opus">Opus</option>
        <option value="wma">WMA</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Calidad</label>
      <select id="quality">
        <option value="low">Baja (128kbps)</option>
        <option value="medium" selected>Media (192kbps)</option>
        <option value="high">Alta (320kbps)</option>
      </select>
    </div>
  `;
}

function getImageSettings() {
  return `
    <div class="setting-group">
      <label>Formato de salida</label>
      <select id="output-format">
        <option value="jpg">JPG</option>
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
      <label>Calidad</label>
      <select id="quality">
        <option value="1">1% (mínima)</option>
        <option value="50">50%</option>
        <option value="80" selected>80%</option>
        <option value="100">100% (máxima)</option>
      </select>
    </div>
  `;
}

function getDocumentSettings() {
  return `
    <div class="setting-group">
      <label>Formato de salida</label>
      <select id="output-format">
        <option value="pdf">PDF</option>
        <option value="docx">DOCX</option>
        <option value="doc">DOC</option>
        <option value="odt">ODT</option>
        <option value="txt">TXT</option>
        <option value="rtf">RTF</option>
        <option value="html">HTML</option>
      </select>
    </div>
  `;
}

function getSpreadsheetSettings() {
  return `
    <div class="setting-group">
      <label>Formato de salida</label>
      <select id="output-format">
        <option value="xlsx">XLSX</option>
        <option value="xls">XLS</option>
        <option value="ods">ODS</option>
        <option value="csv">CSV</option>
        <option value="pdf">PDF</option>
      </select>
    </div>
  `;
}

function getPresentationSettings() {
  return `
    <div class="setting-group">
      <label>Formato de salida</label>
      <select id="output-format">
        <option value="pptx">PPTX</option>
        <option value="ppt">PPT</option>
        <option value="odp">ODP</option>
        <option value="pdf">PDF</option>
      </select>
    </div>
  `;
}

function getCompressSettings() {
  return `
    <div class="setting-group">
      <label>Formato de salida</label>
      <select id="output-format">
        <option value="jpg">JPG</option>
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
      <label>Calidad de compresión</label>
      <input type="range" id="quality" min="1" max="100" value="80">
      <span id="quality-value">80%</span>
    </div>
  `;
}

function updateSettingsPanel() {
  const state = require('./state');
  const settingsContent = document.getElementById('settings-content');
  const { getFileType } = require('./file-handling');

  let settingsHTML = '';
  switch (state.currentConversionType) {
    case 'video': settingsHTML = getVideoSettings(); break;
    case 'audio': settingsHTML = getAudioSettings(); break;
    case 'extract-audio': settingsHTML = getExtractAudioSettings(); break;
    case 'image': settingsHTML = getImageSettings(); break;
    case 'document': settingsHTML = getDocumentSettings(); break;
    case 'spreadsheet': settingsHTML = getSpreadsheetSettings(); break;
    case 'presentation': settingsHTML = getPresentationSettings(); break;
    case 'compress': settingsHTML = getCompressSettings(); break;
    default: settingsHTML = '<p>Tipo de conversión no soportado</p>';
  }

  settingsContent.innerHTML = settingsHTML;

  const qualityRange = document.getElementById('quality');
  if (qualityRange && qualityRange.type === 'range') {
    const qualityValue = document.getElementById('quality-value');
    qualityRange.addEventListener('input', (e) => {
      qualityValue.textContent = e.target.value + '%';
    });
  }

  const filesList = document.getElementById('files-list');
  const { getFileExtensions } = require('./file-handling');
  const extensions = getFileExtensions();

  const filteredFiles = state.currentFiles.filter(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return extensions.includes(ext);
  });

  if (filteredFiles.length === 0) {
    filesList.innerHTML = '<p class="no-files">No hay archivos de este tipo</p>';
  } else {
    filesList.innerHTML = filteredFiles.map((file, index) => {
      const originalIndex = state.currentFiles.indexOf(file);
      return `
        <div class="file-item" data-index="${originalIndex}" data-name="${file.name}">
          <div class="file-item-info">
            <span class="file-item-name">${file.name}</span>
            <span class="file-item-status">${file.status}</span>
          </div>
          <div class="file-item-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${file.progress}%"></div>
            </div>
            <span class="progress-text">${file.progress}%</span>
          </div>
          <button class="file-item-remove" data-index="${originalIndex}">×</button>
        </div>
      `;
    }).join('');
  }
}

module.exports = { updateSettingsPanel };
