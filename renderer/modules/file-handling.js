function getFileName(filePath) {
  return filePath.split('/').pop();
}

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'wma'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'avif', 'heif'];
  const documentExts = ['docx', 'doc', 'odf', 'txt', 'xml', 'json', 'ott', 'docm', 'html', 'fodt', 'uot', 'rtf', 'odt', 'pdf'];
  const spreadsheetExts = ['xls', 'ods', 'ots', 'fods', 'uds', 'xlsx', 'dif', 'dbf', 'slk', 'csv', 'xlsm'];
  const presentationExts = ['ps', 'ppsx', 'odp', 'odg', 'fodp', 'uop', 'potx', 'ppt', 'ppsx', 'pptx', 'potx', 'pptm'];

  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (imageExts.includes(ext)) return 'image';
  if (documentExts.includes(ext)) return 'document';
  if (spreadsheetExts.includes(ext)) return 'spreadsheet';
  if (presentationExts.includes(ext)) return 'presentation';
  return 'unknown';
}

function getFileFilters() {
  const state = require('./state');
  switch (state.currentConversionType) {
    case 'video': return [{ name: 'Videos', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    case 'audio': return [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    case 'extract-audio': return [{ name: 'Videos', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    case 'image': return [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    case 'document': return [{ name: 'Documentos de texto', extensions: ['docx', 'doc', 'odf', 'txt', 'xml', 'json', 'ott', 'docm', 'html', 'fodt', 'uot', 'rtf', 'odt'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    case 'spreadsheet': return [{ name: 'Hojas de cálculo', extensions: ['xls', 'ods', 'ots', 'fods', 'uds', 'xlsx', 'dif', 'dbf', 'slk', 'csv', 'xlsm'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    case 'presentation': return [{ name: 'Presentaciones', extensions: ['ps', 'ppsx', 'odp', 'odg', 'fodp', 'uop', 'potx', 'ppt', 'ppsx', 'pptx', 'potx', 'pptm'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    case 'compress': return [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'] }, { name: 'Todos los archivos', extensions: ['*'] }];
    default: return [{ name: 'Todos los archivos', extensions: ['*'] }];
  }
}

function getFileExtensions() {
  const state = require('./state');
  switch (state.currentConversionType) {
    case 'video': return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    case 'audio': return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus', 'wma'];
    case 'extract-audio': return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];
    case 'image': return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'avif', 'heif'];
    case 'document': return ['docx', 'doc', 'odf', 'txt', 'xml', 'json', 'ott', 'docm', 'html', 'fodt', 'uot', 'rtf', 'odt', 'pdf'];
    case 'spreadsheet': return ['xls', 'ods', 'ots', 'fods', 'uds', 'xlsx', 'dif', 'dbf', 'slk', 'csv', 'xlsm'];
    case 'presentation': return ['ps', 'ppsx', 'odp', 'odg', 'fodp', 'uop', 'potx', 'ppt', 'ppsx', 'pptx', 'potx', 'pptm'];
    case 'compress': return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'avif', 'heif'];
    default: return [];
  }
}

async function openFileDialog(state, updateSettingsPanel, showToast) {
  const dialogOptions = {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Todos los archivos', extensions: ['*'] }, ...getFileFilters()]
  };

  if (state.lastPath) dialogOptions.defaultPath = state.lastPath;

  console.log(`[FILE-DIALOG] Abriendo diálogo para: ${state.currentConversionType}`);
  const result = await window.api.showOpenDialog(dialogOptions);

  if (!result.canceled && result.filePaths.length > 0) {
    const newFiles = result.filePaths.map(p => ({
      path: p,
      name: getFileName(p),
      progress: 0,
      status: 'pending'
    }));
    state.currentFiles = [...state.currentFiles, ...newFiles];
    state.lastPath = result.filePaths[0].substring(0, result.filePaths[0].lastIndexOf('/'));
    document.getElementById('btn-convert').disabled = false;
    document.getElementById('modal-btn-convert').disabled = false;
    updateSettingsPanel();
    console.log(`[FILE-DIALOG] ${newFiles.length} archivo(s) cargado(s): ${newFiles.map(f => f.name).join(', ')}`);
    showToast(`${newFiles.length} archivo(s) cargado(s)`);
  } else {
    console.log(`[FILE-DIALOG] Cancelado por el usuario`);
  }
}

module.exports = { getFileName, getFileType, getFileFilters, getFileExtensions, openFileDialog };
