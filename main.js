const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { convertVideo } = require('./main/converters/video');
const { convertAudio, extractAudio } = require('./main/converters/audio');
const { convertImage, compressImage } = require('./main/converters/image');
const { convertDocument } = require('./main/converters/document');
const { convertSpreadsheet } = require('./main/converters/spreadsheet');
const { convertPresentation } = require('./main/converters/presentation');

let mainWindow;
let activeConversions = new Map();
let isPaused = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, frame: false, titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e', icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-folder', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).slice(1);
    return {
      success: true,
      info: {
        name: path.basename(filePath),
        directory: path.dirname(filePath),
        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
        extension: ext
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-folder-files', async (event, folderPath, extensions) => {
  try {
    const files = fs.readdirSync(folderPath).filter(file => {
      const ext = path.extname(file).slice(1).toLowerCase();
      return extensions.includes(ext);
    });
    return files.map(file => ({
      path: path.join(folderPath, file),
      name: file
    }));
  } catch (error) {
    return [];
  }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron');
  shell.openPath(folderPath);
});

ipcMain.on('pause-conversions', () => { isPaused = true; });
ipcMain.on('resume-conversions', () => { isPaused = false; });
ipcMain.on('stop-conversions', () => {
  activeConversions.forEach(cmd => cmd.kill('SIGKILL'));
  activeConversions.clear();
  isPaused = false;
});

ipcMain.on('conversion-progress', (event, data) => {
  event.sender.send('conversion-progress', data);
});

ipcMain.handle('perform-conversion', async (event, file, outputFormat, quality, outputFolder, fileIndex, conversionType, resolution, ffmpegSettings) => {
  console.log('[IPC-CONVERT] Received conversion request');
  console.log('[IPC-CONVERT] File:', file.path);
  console.log('[IPC-CONVERT] Output format:', outputFormat);
  console.log('[IPC-CONVERT] Conversion type:', conversionType);

  const baseName = path.basename(file.path, path.extname(file.path));
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const outputPath = outputFolder
    ? path.join(outputFolder, sanitizedName + '.' + outputFormat)
    : path.join(path.dirname(file.path), sanitizedName + '.' + outputFormat);

  console.log('[IPC-CONVERT] Output path:', outputPath);

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    return { success: false, error: 'Directorio de salida no existe: ' + outputDir };
  }

  if (ffmpegSettings) ffmpegSettings.hardwareAccel = false;

  try {
    const normalizedType = String(conversionType).trim().toLowerCase();
    console.log('[IPC-CONVERT] Normalized type:', normalizedType);

    let result;
    switch (normalizedType) {
      case 'video': result = await convertVideo(file.path, outputPath, outputFormat, quality, event, fileIndex, resolution, ffmpegSettings); break;
      case 'audio': result = await convertAudio(file.path, outputPath, outputFormat, quality, event, fileIndex); break;
      case 'extract-audio': result = await extractAudio(file.path, outputPath, outputFormat, quality, event, fileIndex); break;
      case 'image': result = await convertImage(file.path, outputPath, outputFormat, quality, event, fileIndex); break;
      case 'document': result = await convertDocument(file.path, outputPath, outputFormat, quality, event, fileIndex); break;
      case 'spreadsheet': result = await convertSpreadsheet(file.path, outputPath, outputFormat, quality, event, fileIndex); break;
      case 'presentation': result = await convertPresentation(file.path, outputPath, outputFormat, quality, event, fileIndex); break;
      case 'compress': result = await compressImage(file.path, outputPath, outputFormat, quality, event, fileIndex); break;
      default: throw new Error('Tipo de conversión no soportado: ' + normalizedType);
    }

    console.log('[IPC-CONVERT] Conversion completed successfully');
    return { success: true, outputPath };
  } catch (error) {
    console.error('[IPC-CONVERT] Conversion error:', error.message);
    throw error;
  }
});
