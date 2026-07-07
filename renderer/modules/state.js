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

module.exports = {
  get currentFiles() { return currentFiles; },
  set currentFiles(val) { currentFiles = val; },
  get currentConversionType() { return currentConversionType; },
  set currentConversionType(val) { currentConversionType = val; },
  get lastPath() { return lastPath; },
  set lastPath(val) { lastPath = val; },
  get outputFolder() { return outputFolder; },
  set outputFolder(val) { outputFolder = val; },
  get isConverting() { return isConverting; },
  set isConverting(val) { isConverting = val; },
  get conversionQueue() { return conversionQueue; },
  set conversionQueue(val) { conversionQueue = val; },
  get activePromises() { return activePromises; },
  set activePromises(val) { activePromises = val; },
  get ffmpegSettings() { return ffmpegSettings; },
  set ffmpegSettings(val) { ffmpegSettings = val; },
  get consolePanelVisible() { return consolePanelVisible; },
  set consolePanelVisible(val) { consolePanelVisible = val; }
};
