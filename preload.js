const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog-open', options),
  showOpenFolder: (options) => ipcRenderer.invoke('dialog-open-folder', options),
  readFolderFiles: (folderPath, extensions) => ipcRenderer.invoke('read-folder-files', folderPath, extensions),
  showSaveFolder: (options) => ipcRenderer.invoke('dialog-save-folder', options),
  performConversion: (file, outputFormat, quality, outputFolder, fileIndex, conversionType, resolution, ffmpegSettings) => ipcRenderer.invoke('perform-conversion', file, outputFormat, quality, outputFolder, fileIndex, conversionType, resolution, ffmpegSettings),
  onConversionProgress: (callback) => ipcRenderer.on('conversion-progress', callback),
  removeConversionProgressListener: (callback) => ipcRenderer.removeListener('conversion-progress', callback),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  pauseConversions: () => ipcRenderer.invoke('pause-conversions'),
  resumeConversions: () => ipcRenderer.invoke('resume-conversions'),
  stopConversions: () => ipcRenderer.invoke('stop-conversions'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools')
});
